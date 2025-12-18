import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Building2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSupplierSchema, type Supplier, type InsertSupplier } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { applyCnpjMask, applyPhoneMask, applyCepMask, removeMask, validateEmail, validateCnpj, validateCep } from "@/utils/masks";
import { fetchAddressByCep } from "@/utils/viaCep";
import { useCompanyFilter } from "@/contexts/company-context";

export default function Suppliers() {
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = useCompanyFilter();

  const form = useForm<InsertSupplier>({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      email: "",
      phone: "",
      contactPerson: "",
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      notes: "",
    },
  });

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers', companyId],
    queryFn: async () => {
      const url = companyId ? `/api/suppliers?companyId=${companyId}` : '/api/suppliers';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      const dataWithCompany = companyId ? { ...data, companyId } : data;
      return await apiRequest('POST', '/api/suppliers', dataWithCompany);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Sucesso",
        description: "Fornecedor criado com sucesso",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar fornecedor",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertSupplier> }) => {
      return await apiRequest('PUT', `/api/suppliers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Sucesso",
        description: "Fornecedor atualizado com sucesso",
      });
      setDialogOpen(false);
      setEditingSupplier(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar fornecedor",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({
        title: "Sucesso",
        description: "Fornecedor excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir fornecedor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSupplier) => {
    // Remove masks from data before sending to API
    const cleanedData = {
      ...data,
      phone: removeMask(data.phone || ""),
      cnpj: data.cnpj ? removeMask(data.cnpj) : "",
      cep: data.cep ? removeMask(data.cep) : "",
    };
    
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    // Convert null values to empty strings for the form and apply masks
    const formData = {
      name: supplier.name,
      cnpj: supplier.cnpj ? applyCnpjMask(supplier.cnpj) : "",
      email: supplier.email || "",
      phone: supplier.phone ? applyPhoneMask(supplier.phone) : "",
      contactPerson: supplier.contactPerson || "",
      cep: supplier.cep ? applyCepMask(supplier.cep) : "",
      street: supplier.street || "",
      number: supplier.number || "",
      neighborhood: supplier.neighborhood || "",
      city: supplier.city || "",
      state: supplier.state || "",
      notes: supplier.notes || "",
    };
    form.reset(formData);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewSupplier = () => {
    setEditingSupplier(null);
    form.reset();
    setDialogOpen(true);
  };

  const handleCepBlur = async (cep: string) => {
    if (!validateCep(cep)) return;

    setLoadingCep(true);
    try {
      const address = await fetchAddressByCep(cep);
      if (address) {
        form.setValue('street', address.logradouro);
        form.setValue('neighborhood', address.bairro);
        form.setValue('city', address.localidade);
        form.setValue('state', address.uf);
        
        toast({
          title: "Endereço encontrado",
          description: "Endereço preenchido automaticamente",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao buscar endereço pelo CEP",
        variant: "destructive",
      });
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCnpjChange = (value: string, onChange: (value: string) => void) => {
    const maskedValue = applyCnpjMask(value);
    onChange(maskedValue);
  };

  const handlePhoneChange = (value: string, onChange: (value: string) => void) => {
    const maskedValue = applyPhoneMask(value);
    onChange(maskedValue);
  };

  const handleCepChange = (value: string, onChange: (value: string) => void) => {
    const maskedValue = applyCepMask(value);
    onChange(maskedValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando fornecedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="suppliers-page">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Building2 className="h-6 w-6 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewSupplier} data-testid="button-add-supplier">
              <Plus className="w-4 h-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-6xl w-full !max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Fornecedor</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da empresa" {...field} data-testid="input-supplier-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="00.000.000/0000-00" 
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => handleCnpjChange(e.target.value, field.onChange)}
                            data-testid="input-supplier-cnpj" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="email@fornecedor.com" 
                            {...field}
                            value={field.value || ""}
                            data-testid="input-supplier-email" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(11) 99999-9999" 
                            {...field}
                            onChange={(e) => handlePhoneChange(e.target.value, field.onChange)}
                            data-testid="input-supplier-phone" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pessoa de Contato</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do responsável" 
                          {...field}
                          value={field.value || ""}
                          data-testid="input-supplier-contact" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Primeira linha: CEP, Rua e Número alinhados */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="00000-000" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => handleCepChange(e.target.value, field.onChange)}
                              onBlur={(e) => handleCepBlur(e.target.value)}
                              disabled={loadingCep}
                              data-testid="input-supplier-cep" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-7">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rua</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome da rua" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-supplier-street" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-supplier-number" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Segunda linha: Bairro, Cidade maior e Estado */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5">
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome do bairro" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-supplier-neighborhood" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-5">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome da cidade" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-supplier-city" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="SP" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-supplier-state" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações sobre o fornecedor" 
                          {...field}
                          value={field.value || ""}
                          data-testid="input-supplier-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-supplier"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum fornecedor cadastrado</p>
                    <p className="text-sm">Clique em "Novo Fornecedor" para começar</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id} data-testid={`supplier-row-${supplier.id}`}>
                  <TableCell className="font-medium" data-testid={`text-supplier-name-${supplier.id}`}>
                    {supplier.name}
                  </TableCell>
                  <TableCell data-testid={`text-supplier-cnpj-${supplier.id}`}>
                    {supplier.cnpj || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-supplier-email-${supplier.id}`}>
                    {supplier.email || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-supplier-phone-${supplier.id}`}>
                    {supplier.phone}
                  </TableCell>
                  <TableCell data-testid={`text-supplier-city-${supplier.id}`}>
                    {supplier.city || "-"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      supplier.isActive 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {supplier.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(supplier)}
                        data-testid={`button-edit-supplier-${supplier.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(supplier.id)}
                        className="text-red-600 hover:text-red-800"
                        data-testid={`button-delete-supplier-${supplier.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}