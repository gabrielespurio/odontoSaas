import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Package, Check, X, Calendar } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Supplier = {
  id: number;
  name: string;
};

type PurchaseOrder = {
  id: number;
  orderNumber: string;
};

type ReceivingItem = {
  id: number;
  purchaseOrderItemId: number;
  description: string;
  quantityOrdered: string;
  quantityReceived: string;
  unitPrice: string;
  totalPrice: string;
  notes?: string;
};

type ReceivingWithDetails = {
  id: number;
  receivingNumber: string;
  purchaseOrderId: number;
  supplierId: number;
  receivingDate?: string;
  status: "pending" | "partial" | "received" | "cancelled";
  totalAmount: string;
  notes?: string;
  supplier: Supplier;
  purchaseOrder: PurchaseOrder;
  items: ReceivingItem[];
  createdAt: string;
  updatedAt: string;
};

const receivingStatusSchema = z.object({
  status: z.enum(["pending", "partial", "received", "cancelled"]),
  receivingDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    id: z.number(),
    quantityReceived: z.number().min(0),
    totalPrice: z.number().min(0),
  })).optional(),
});

type ReceivingStatusForm = z.infer<typeof receivingStatusSchema>;

export default function Receivings() {
  const [updatingReceiving, setUpdatingReceiving] = useState<ReceivingWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReceivingStatusForm>({
    resolver: zodResolver(receivingStatusSchema),
    defaultValues: {
      status: "pending",
      receivingDate: "",
      notes: "",
      items: [],
    },
  });

  const { data: receivings = [], isLoading } = useQuery<ReceivingWithDetails[]>({
    queryKey: ['/api/receivings'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ReceivingStatusForm }) => {
      return await apiRequest(`/api/receivings/${id}/status`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receivings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payables'] });
      toast({
        title: "Sucesso",
        description: "Status do recebimento atualizado com sucesso",
      });
      setDialogOpen(false);
      setUpdatingReceiving(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status do recebimento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReceivingStatusForm) => {
    if (updatingReceiving) {
      updateStatusMutation.mutate({ id: updatingReceiving.id, data });
    }
  };

  const handleUpdateStatus = (receiving: ReceivingWithDetails) => {
    setUpdatingReceiving(receiving);
    form.reset({
      status: "received", // Sempre inicia com status "Recebido"
      receivingDate: receiving.receivingDate || new Date().toISOString().split('T')[0],
      notes: receiving.notes || "",
      items: receiving.items.map(item => {
        // Se a quantidade recebida for 0, preenche com a quantidade pedida
        const quantityReceived = parseFloat(item.quantityReceived) || parseFloat(item.quantityOrdered);
        const unitPrice = parseFloat(item.unitPrice);
        return {
          id: item.id,
          quantityReceived: quantityReceived,
          totalPrice: quantityReceived * unitPrice,
        };
      }),
    });
    setDialogOpen(true);
  };

  const calculateItemTotal = (index: number) => {
    if (!updatingReceiving) return;
    
    const quantityReceived = form.watch(`items.${index}.quantityReceived`) || 0;
    const unitPrice = parseFloat(updatingReceiving.items[index].unitPrice);
    const total = quantityReceived * unitPrice;
    form.setValue(`items.${index}.totalPrice`, total);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "partial":
        return "bg-blue-100 text-blue-800";
      case "received":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "partial":
        return "Parcial";
      case "received":
        return "Recebido";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando recebimentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="receivings-page">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">Recebimentos</h1>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Atualizar Recebimento - {updatingReceiving?.receivingNumber}
            </DialogTitle>
          </DialogHeader>
          {updatingReceiving && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-receiving-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="partial">Parcial</SelectItem>
                            <SelectItem value="received">Recebido</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receivingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Recebimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-receiving-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Itens para Recebimento</h3>
                  <div className="space-y-4">
                    {updatingReceiving.items.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-4">
                        <div>
                          <h4 className="font-medium">{item.description}</h4>
                          <p className="text-sm text-gray-600">
                            Preço unitário: R$ {parseFloat(item.unitPrice).toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="space-y-2">
                              <div className="text-sm font-medium leading-none">Quantidade Pedida</div>
                              <Input 
                                value={item.quantityOrdered} 
                                readOnly 
                                className="bg-gray-50"
                              />
                            </div>
                          </div>
                          <div>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantityReceived`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantidade Recebida</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      max={parseFloat(item.quantityOrdered)}
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(parseFloat(e.target.value) || 0);
                                        calculateItemTotal(index);
                                      }}
                                      data-testid={`input-quantity-received-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div>
                            <FormField
                              control={form.control}
                              name={`items.${index}.totalPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor Total</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      readOnly
                                      {...field}
                                      className="bg-gray-50"
                                      data-testid={`input-item-total-${index}`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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
                          placeholder="Observações sobre o recebimento" 
                          {...field} 
                          data-testid="input-receiving-notes"
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
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-save-receiving"
                  >
                    {updateStatusMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Data Recebimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum recebimento disponível</p>
                    <p className="text-sm">Os recebimentos são criados automaticamente ao criar pedidos de compra</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              receivings.map((receiving) => (
                <TableRow key={receiving.id} data-testid={`receiving-row-${receiving.id}`}>
                  <TableCell className="font-medium" data-testid={`text-receiving-number-${receiving.id}`}>
                    {receiving.receivingNumber}
                  </TableCell>
                  <TableCell data-testid={`text-receiving-order-${receiving.id}`}>
                    {receiving.purchaseOrder?.orderNumber}
                  </TableCell>
                  <TableCell data-testid={`text-receiving-supplier-${receiving.id}`}>
                    {receiving.supplier?.name}
                  </TableCell>
                  <TableCell data-testid={`text-receiving-date-${receiving.id}`}>
                    {receiving.receivingDate || "Não recebido"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receiving.status)}`}>
                      {getStatusLabel(receiving.status)}
                    </span>
                  </TableCell>
                  <TableCell data-testid={`text-receiving-total-${receiving.id}`}>
                    R$ {parseFloat(receiving.totalAmount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {receiving.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(receiving)}
                          data-testid={`button-update-receiving-${receiving.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Receber
                        </Button>
                      )}
                      {receiving.status === "partial" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(receiving)}
                          data-testid={`button-complete-receiving-${receiving.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Completar
                        </Button>
                      )}
                      {receiving.status === "received" && (
                        <span className="text-sm text-green-600 font-medium">
                          ✓ Recebido
                        </span>
                      )}
                      {receiving.status === "cancelled" && (
                        <span className="text-sm text-red-600 font-medium">
                          ✗ Cancelado
                        </span>
                      )}
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