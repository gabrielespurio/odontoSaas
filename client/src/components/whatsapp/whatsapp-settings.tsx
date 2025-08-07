import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCompanyContext } from "@/contexts/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageCircle, QrCode, CheckCircle, AlertCircle, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface WhatsAppStatus {
  status: string;
  instanceId: string | null;
  qrCode: string | null;
  connectedAt: string | null;
}

const testMessageSchema = z.object({
  phoneNumber: z.string().min(10, "Número deve ter pelo menos 10 dígitos"),
  message: z.string().min(1, "Mensagem é obrigatória")
});

type TestMessageFormData = z.infer<typeof testMessageSchema>;

export default function WhatsAppSettings() {
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [localSelectedCompanyId, setLocalSelectedCompanyId] = useState<number | null>(null);
  const { toast } = useToast();
  const { selectedCompanyId: contextSelectedCompanyId, companies: contextCompanies, isSystemAdmin } = useCompanyContext();

  console.log('WhatsAppSettings: Component rendered');

  // Fetch user info to check if superadmin
  const { data: userCompany } = useQuery({
    queryKey: ["/api/user/company"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/company", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      return response.json();
    },
  });

  // Fetch companies list for superadmin
  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/companies", {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      return response.json();
    },
    enabled: userCompany?.isSuperAdmin,
  });

  const isSuperAdmin = userCompany?.isSuperAdmin || isSystemAdmin;
  
  // Use company context for superadmins, user company for regular users  
  const companyIdToUse = isSuperAdmin 
    ? (contextSelectedCompanyId || localSelectedCompanyId || userCompany?.companyId) 
    : userCompany?.companyId;
  
  // Auto-select first company for superadmins if none selected
  useEffect(() => {
    const availableCompanies = contextCompanies || companies || [];
    if (isSuperAdmin && availableCompanies.length > 0 && !contextSelectedCompanyId && !localSelectedCompanyId) {
      console.log('Auto-selecting first company:', availableCompanies[0]);
      setLocalSelectedCompanyId(availableCompanies[0].id);
    }
  }, [isSuperAdmin, contextCompanies, companies, contextSelectedCompanyId, localSelectedCompanyId]);
  
  console.log('WhatsAppSettings: userCompany:', userCompany);
  console.log('WhatsAppSettings: isSuperAdmin:', isSuperAdmin);
  console.log('WhatsAppSettings: contextSelectedCompanyId:', contextSelectedCompanyId);
  console.log('WhatsAppSettings: localSelectedCompanyId:', localSelectedCompanyId);
  console.log('WhatsAppSettings: companyIdToUse:', companyIdToUse);
  console.log('WhatsAppSettings: companies:', companies);
  console.log('WhatsAppSettings: contextCompanies:', contextCompanies);

  // Fetch WhatsApp status
  const { data: whatsappStatus, isLoading, refetch } = useQuery<WhatsAppStatus>({
    queryKey: ["/api/whatsapp/status", companyIdToUse],
    queryFn: async () => {
      if (!companyIdToUse) {
        console.log('WhatsApp Query: No company ID available');
        return null;
      }
      
      console.log('WhatsApp Query: Fetching status for company:', companyIdToUse, 'SuperAdmin:', isSuperAdmin);
      
      const token = localStorage.getItem("token");
      const url = isSuperAdmin 
        ? `/api/whatsapp/status?companyId=${companyIdToUse}`
        : "/api/whatsapp/status";
        
      console.log('WhatsApp Query: URL:', url);
        
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      console.log('WhatsApp Query: Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('WhatsApp Query: Error response:', errorText);
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('WhatsApp Query: Response data:', data);
      return data;
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    enabled: !!companyIdToUse,
  });

  // Test message form
  const testForm = useForm<TestMessageFormData>({
    resolver: zodResolver(testMessageSchema),
    defaultValues: {
      phoneNumber: "",
      message: "Olá! Esta é uma mensagem de teste do OdontoSync.",
    },
  });

  // Setup WhatsApp mutation
  const setupMutation = useMutation({
    mutationFn: () => {
      const payload = companyIdToUse ? { companyId: companyIdToUse } : {};
      console.log('WhatsApp Setup: Mutation payload:', payload);
      console.log('WhatsApp Setup: Making API request...');
      return apiRequest("POST", "/api/whatsapp/setup", payload);
    },
    onSuccess: (data) => {
      console.log('WhatsApp Setup: Success response:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      toast({
        title: "WhatsApp configurado!",
        description: "Escaneie o QR code com seu WhatsApp para conectar.",
      });
    },
    onError: (error) => {
      console.error('WhatsApp Setup: Error response:', error);
      toast({
        title: "Erro na configuração",
        description: "Não foi possível configurar o WhatsApp.",
        variant: "destructive",
      });
    },
  });

  // Refresh QR code mutation
  const refreshQRMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/refresh-qr", 
      companyIdToUse ? { companyId: companyIdToUse } : {}
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      toast({
        title: "QR Code atualizado!",
        description: "Um novo QR code foi gerado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o QR code.",
        variant: "destructive",
      });
    },
  });

  // Send test message mutation
  const sendTestMutation = useMutation({
    mutationFn: (data: TestMessageFormData) => 
      apiRequest("POST", "/api/whatsapp/test-message", 
        companyIdToUse ? { ...data, companyId: companyIdToUse } : data
      ),
    onSuccess: () => {
      setShowTestDialog(false);
      testForm.reset();
      toast({
        title: "Mensagem enviada!",
        description: "A mensagem de teste foi enviada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem de teste.",
        variant: "destructive",
      });
    },
  });

  const handleSetupWhatsApp = () => {
    console.log('WhatsApp Setup: Button clicked!');
    console.log('WhatsApp Setup: isSuperAdmin:', isSuperAdmin);
    console.log('WhatsApp Setup: contextSelectedCompanyId:', contextSelectedCompanyId);
    console.log('WhatsApp Setup: localSelectedCompanyId:', localSelectedCompanyId);
    console.log('WhatsApp Setup: companyIdToUse:', companyIdToUse);
    
    setupMutation.mutate();
  };

  const handleRefreshQR = () => {
    refreshQRMutation.mutate();
  };

  const handleSendTest = (data: TestMessageFormData) => {
    sendTestMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'qrcode':
        return <Badge variant="secondary"><QrCode className="w-3 h-3 mr-1" />Aguardando QR</Badge>;
      case 'not_configured':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Não configurado</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Desconectado</Badge>;
    }
  };

  console.log('WhatsApp Settings Debug:', {
    isSuperAdmin,
    companyIdToUse,
    contextSelectedCompanyId,
    localSelectedCompanyId,
    userCompany: userCompany?.companyId,
    isLoading,
    whatsappStatus,
    whatsappStatusLoading: isLoading
  });

  console.log('WhatsApp Render Check:', { isLoading, companyIdToUse, whatsappStatus });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
          <p>Loading WhatsApp settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-100 p-3 rounded text-sm">
        <strong>Debug Info:</strong><br/>
        Loading: {isLoading ? 'Yes' : 'No'}<br/>
        Company ID: {companyIdToUse || 'N/A'}<br/>
        SuperAdmin: {isSuperAdmin ? 'Yes' : 'No'}<br/>
        Selected Company: {(contextSelectedCompanyId || localSelectedCompanyId || 'N/A').toString()}<br/>
        User Company: {userCompany?.companyId || 'N/A'}<br/>
        WhatsApp Status: {whatsappStatus?.status || 'N/A'}<br/>
        Has WhatsApp Data: {whatsappStatus ? 'Yes' : 'No'}
      </div>

      {/* Company selection for superadmins */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Empresa</CardTitle>
            <CardDescription>
              Escolha a empresa para configurar o WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="company-select">Empresa</Label>
              <Select 
                value={(contextSelectedCompanyId || localSelectedCompanyId)?.toString() || ""} 
                onValueChange={(value) => {
                  const companyId = parseInt(value);
                  setLocalSelectedCompanyId(companyId);
                  console.log('Company selected:', companyId);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {(contextCompanies || companies)?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Show message if superadmin hasn't selected company */}
      {isSuperAdmin && !companyIdToUse && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-600">Selecione uma empresa acima para configurar o WhatsApp</p>
            <div className="mt-4 p-3 bg-blue-100 rounded text-sm">
              <strong>Auto-selection Debug:</strong><br/>
              Companies loaded: {companies ? companies.length : 0}<br/>
              Selected company: {contextSelectedCompanyId || localSelectedCompanyId || 'None'}<br/>
              {(contextCompanies || companies) && (contextCompanies || companies).length > 0 && (
                <Button 
                  onClick={() => setLocalSelectedCompanyId((contextCompanies || companies)[0].id)}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  Selecionar primeira empresa ({(contextCompanies || companies)[0].name})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* WhatsApp configuration - ALWAYS show for debugging */}
      {(companyIdToUse || true) && (
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-6 h-6 text-green-600" />
              <div>
                <CardTitle>Configuração do WhatsApp</CardTitle>
                <CardDescription>
                  Configure o WhatsApp para envio automático de lembretes e notificações
                </CardDescription>
              </div>
            </div>
            {whatsappStatus && getStatusBadge(whatsappStatus.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(whatsappStatus?.status === 'not_configured' || !whatsappStatus || true) && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Para começar a usar o WhatsApp, você precisa configurar uma instância para sua empresa.
                Isso permitirá o envio automático de lembretes de consultas.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    console.log('WhatsApp Setup: Button clicked directly!');
                    handleSetupWhatsApp();
                  }} 
                  disabled={setupMutation.isPending || !companyIdToUse}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  {setupMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Configurar WhatsApp
                    </>
                  )}
                </Button>
                
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <strong>Debug Info:</strong><br/>
                  Company ID: {companyIdToUse || 'N/A'}<br/>
                  SuperAdmin: {isSuperAdmin ? 'Sim' : 'Não'}<br/>
                  Status: {whatsappStatus?.status || 'N/A'}<br/>
                  Button Disabled: {setupMutation.isPending || !companyIdToUse ? 'Sim' : 'Não'}<br/>
                  Disabled Reason: {!companyIdToUse ? 'No Company ID' : setupMutation.isPending ? 'Pending' : 'None'}<br/>
                  WhatsApp Data: {JSON.stringify(whatsappStatus, null, 2)}
                </div>
              </div>
            </div>
          )}

          {whatsappStatus?.status === 'qrcode' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2 mb-2">
                  <QrCode className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">Escaneie o QR Code</h3>
                </div>
                <p className="text-sm text-yellow-700 mb-4">
                  Abra o WhatsApp no seu celular e escaneie o código abaixo para conectar:
                </p>
                
                {whatsappStatus.qrCode ? (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={whatsappStatus.qrCode}
                      alt="WhatsApp QR Code"
                      className="w-48 h-48 border rounded-lg shadow-lg"
                      onError={(e) => {
                        console.error('QR Code image failed to load:', e);
                        console.log('QR Code data length:', whatsappStatus.qrCode?.length);
                        console.log('QR Code preview:', whatsappStatus.qrCode?.substring(0, 50) + '...');
                        // Try with base64 prefix if it fails
                        const img = e.target as HTMLImageElement;
                        if (!whatsappStatus.qrCode.startsWith('data:')) {
                          img.src = `data:image/png;base64,${whatsappStatus.qrCode}`;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex justify-center mb-4">
                    <div className="w-48 h-48 border rounded-lg flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
                        <p className="text-sm text-gray-500">Gerando QR Code...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshQR}
                    disabled={refreshQRMutation.isPending}
                  >
                    {refreshQRMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Atualizar QR
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verificar Status
                  </Button>
                </div>
              </div>
            </div>
          )}

          {whatsappStatus?.status === 'qrcode' && !whatsappStatus.qrCode && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <h3 className="font-semibold text-blue-800">Configurando WhatsApp</h3>
                </div>
                <p className="text-sm text-blue-700 mb-4">
                  Aguarde enquanto geramos o QR Code para conexão...
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshQR}
                  disabled={refreshQRMutation.isPending}
                >
                  {refreshQRMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Gerar QR Code
                </Button>
              </div>
            </div>
          )}

          {whatsappStatus?.status === 'connected' && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">WhatsApp Conectado!</h3>
                </div>
                <p className="text-sm text-green-700">
                  Seu WhatsApp está conectado e funcionando. Os pacientes receberão lembretes automáticos.
                </p>
                {whatsappStatus.connectedAt && (
                  <p className="text-xs text-green-600 mt-1">
                    Conectado em: {new Date(whatsappStatus.connectedAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              <div className="flex space-x-2">
                <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Teste
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enviar Mensagem de Teste</DialogTitle>
                    </DialogHeader>
                    <Form {...testForm}>
                      <form onSubmit={testForm.handleSubmit(handleSendTest)} className="space-y-4">
                        <FormField
                          control={testForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número do WhatsApp</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="(11) 99999-9999"
                                  type="tel"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={testForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mensagem</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Digite sua mensagem"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setShowTestDialog(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={sendTestMutation.isPending}>
                            {sendTestMutation.isPending ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verificar Status
                </Button>
              </div>
            </div>
          )}

          {whatsappStatus?.status === 'disconnected' && (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">WhatsApp Desconectado</h3>
                </div>
                <p className="text-sm text-red-700 mb-4">
                  O WhatsApp foi desconectado. Configure novamente para continuar enviando lembretes.
                </p>
                <Button 
                  onClick={handleSetupWhatsApp} 
                  disabled={setupMutation.isPending}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {setupMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Reconectando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Reconectar WhatsApp
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        </Card>
      )}
    </div>
  );
}