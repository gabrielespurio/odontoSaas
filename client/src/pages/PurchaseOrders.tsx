import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  Eye, 
  FileText 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPurchaseOrderSchema, insertPurchaseOrderItemSchema, type PurchaseOrder, type Supplier, type Product, type InsertPurchaseOrder, type InsertPurchaseOrderItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useCompanyFilter } from "@/contexts/company-context";

type PurchaseOrderWithDetails = PurchaseOrder & {
  supplier: Supplier;
  items: Array<{
    id: number;
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
    notes?: string;
  }>;
};

const purchaseOrderFormSchema = insertPurchaseOrderSchema.extend({
  paymentDate: z.string().optional().nullable(),
  installments: z.number().min(1, "Número de parcelas deve ser entre 1 e 12").max(12, "Número de parcelas deve ser entre 1 e 12").default(1),
  items: z.array(
    insertPurchaseOrderItemSchema
      .omit({ purchaseOrderId: true })
      .extend({
        productId: z.number().optional(),
        productName: z.string().optional(), // Campo auxiliar para exibição
      })
  ).min(1, "Adicione pelo menos um item"),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>;

export default function PurchaseOrders() {
  const [editingOrder, setEditingOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompanyFilter();

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      supplierId: 0,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: "",
      status: "draft",
      totalAmount: 0,
      paymentDate: "",
      installments: 1,
      notes: "",
      items: [
        {
          productId: undefined,
          productName: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          notes: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: orders = [], isLoading } = useQuery<PurchaseOrderWithDetails[]>({
    queryKey: ['/api/purchase-orders', companyId],
    queryFn: async () => {
      const url = companyId ? `/api/purchase-orders?companyId=${companyId}` : '/api/purchase-orders';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      return response.json();
    },
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
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

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products', companyId],
    queryFn: async () => {
      const url = companyId ? `/api/products?companyId=${companyId}` : '/api/products';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseOrderFormData) => {
      const dataWithCompany = companyId ? { ...data, companyId } : data;
      return await apiRequest('POST', '/api/purchase-orders', dataWithCompany);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/receivings'] });
      toast({
        title: "Sucesso",
        description: "Pedido de compra criado com sucesso",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pedido de compra",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PurchaseOrderFormData> }) => {
      return await apiRequest('PUT', `/api/purchase-orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/receivings'] });
      toast({
        title: "Sucesso",
        description: "Pedido de compra atualizado com sucesso",
      });
      setDialogOpen(false);
      setEditingOrder(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar pedido de compra",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/receivings'] });
      toast({
        title: "Sucesso",
        description: "Pedido de compra excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir pedido de compra",
        variant: "destructive",
      });
    },
  });

  const calculateItemTotal = (index: number) => {
    const quantity = parseFloat(form.watch(`items.${index}.quantity`) as any) || 0;
    const unitPrice = parseFloat(form.watch(`items.${index}.unitPrice`) as any) || 0;
    const total = quantity * unitPrice;
    form.setValue(`items.${index}.totalPrice`, total);
    
    // Calculate total amount and installments
    const items = form.getValues("items");
    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice as any) || 0), 0);
    form.setValue("totalAmount", totalAmount);
    
    // Trigger form re-render to update installment display
    form.trigger(["installments"]);
  };

  const calculateInstallments = () => {
    const totalAmount = form.getValues("totalAmount") || 0;
    const installments = form.getValues("installments") || 1;
    return totalAmount / installments;
  };

  const onSubmit = (data: PurchaseOrderFormData) => {
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (order: PurchaseOrderWithDetails) => {
    setEditingOrder(order);
    form.reset({
      ...order,
      totalAmount: parseFloat(order.totalAmount.toString()),
      orderDate: order.orderDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: order.expectedDeliveryDate || "",
      paymentDate: order.paymentDate || "",
      installments: order.installments || 1,
      items: order.items.map(item => ({
        ...item,
        productId: undefined, // Valor padrão para novos campos
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
      })),
    });
    setDialogOpen(true);
  };

  const handleView = (order: PurchaseOrderWithDetails) => {
    setViewingOrder(order);
    setViewDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este pedido de compra?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewOrder = () => {
    setEditingOrder(null);
    form.reset();
    setDialogOpen(true);
  };

    const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-yellow-500 text-white";
      case "received":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Pendente";
      case "received":
        return "Recebido";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="purchase-orders-page">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-6 w-6 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">Pedidos de Compra</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewOrder} data-testid="button-add-order">
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-6xl w-full !max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? "Editar Pedido de Compra" : "Novo Pedido de Compra"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <div className="overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fornecedor</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-supplier">
                              <SelectValue placeholder="Selecione o fornecedor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="orderDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data do Pedido</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-order-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expectedDeliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Prevista de Entrega</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} data-testid="input-delivery-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Pendente</SelectItem>
                            <SelectItem value="received">Recebido</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Itens do Pedido</h3>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => append({
                        productId: undefined,
                        productName: "",
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                        totalPrice: 0,
                        notes: "",
                      })}
                      data-testid="button-add-item"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Produto</FormLabel>
                              <Select 
                                value={field.value ? field.value.toString() : "custom"} 
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    field.onChange(undefined);
                                    form.setValue(`items.${index}.description`, "");
                                  } else {
                                    const productId = parseInt(value);
                                    const selectedProduct = products.find(p => p.id === productId);
                                    field.onChange(productId);
                                    
                                    // Atualiza a descrição automaticamente
                                    if (selectedProduct) {
                                      form.setValue(`items.${index}.description`, selectedProduct.name);
                                    }
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid={`select-product-${index}`}>
                                    <SelectValue placeholder="Selecione um produto do estoque ou deixe em branco para item personalizado" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="custom">Item personalizado (sem produto do estoque)</SelectItem>
                                  {products?.filter(p => p.isActive).map((product) => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      {product.name} - {product.unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Descrição do item (preenchida automaticamente ao selecionar produto)" 
                                    {...field} 
                                    data-testid={`input-item-description-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantidade</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                      calculateItemTotal(index);
                                    }}
                                    data-testid={`input-item-quantity-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Preço Unitário</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                      calculateItemTotal(index);
                                    }}
                                    data-testid={`input-item-price-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.totalPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preço Total</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  readOnly
                                  {...field}
                                  data-testid={`input-item-total-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Observações</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Observações do item" 
                                  {...field} 
                                  value={field.value || ""}
                                  data-testid={`input-item-notes-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            readOnly
                            {...field}
                            data-testid="input-total-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data do Pagamento</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                            data-testid="input-payment-date" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcelas</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(parseInt(value));
                          }} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-installments">
                              <SelectValue placeholder="Selecione as parcelas" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => {
                              const totalAmount = form.getValues("totalAmount") || 0;
                              const installmentValue = totalAmount / num;
                              return (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}x {num === 1 ? `(à vista - R$ ${installmentValue.toFixed(2)})` : `(R$ ${installmentValue.toFixed(2)} por parcela)`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        <div className="text-sm text-gray-600 mt-1">
                          {field.value === 1 ? (
                            <span>Pagamento à vista: R$ {(form.getValues("totalAmount") || 0).toFixed(2)}</span>
                          ) : (
                            <span>Valor por parcela: R$ {((form.getValues("totalAmount") || 0) / (field.value || 1)).toFixed(2)}</span>
                          )}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações sobre o pedido" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-order-notes"
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
                    data-testid="button-save-order"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
                </form>
              </div>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Pedido {viewingOrder?.orderNumber}</DialogTitle>
                <p className="text-sm text-white/80">Detalhes do pedido de compra</p>
              </div>
            </div>
          </DialogHeader>

          {viewingOrder && (
            <div className="bg-background">
              <div className="p-6 space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fornecedor</label>
                    <p className="font-medium text-foreground">{viewingOrder.supplier?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                    <div>
                      <Badge className={`${getStatusColor(viewingOrder.status)} border-none px-3 py-1`}>
                        {getStatusLabel(viewingOrder.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data do Pedido</label>
                    <p className="font-medium text-foreground">{viewingOrder.orderDate}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Previsão de Entrega</label>
                    <p className="font-medium text-foreground">{viewingOrder.expectedDeliveryDate || "Não informada"}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Itens do Pedido</h3>
                  <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-bold">Descrição</TableHead>
                          <TableHead className="text-xs font-bold text-center">Qtd</TableHead>
                          <TableHead className="text-xs font-bold text-right">Preço Unit.</TableHead>
                          <TableHead className="text-xs font-bold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingOrder.items.map((item, index) => (
                          <TableRow key={index} className="hover:bg-muted/30 transition-colors border-border/50">
                            <TableCell className="text-sm font-medium py-3">
                              {item.description}
                            </TableCell>
                            <TableCell className="text-sm text-center py-3">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-sm text-right py-3 tabular-nums">
                              R$ {parseFloat(item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-sm text-right py-3 font-semibold tabular-nums text-primary">
                              R$ {parseFloat(item.totalPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-border/50">
                  <div className="space-y-1 max-w-md">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</label>
                    <p className="text-sm text-foreground leading-relaxed italic">
                      {viewingOrder.notes || "Nenhuma observação registrada."}
                    </p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 min-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">Valor Total do Pedido</label>
                    <p className="text-2xl font-black text-primary tabular-nums">
                      R$ {parseFloat(viewingOrder.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="hover-elevate">
                  Fechar
                </Button>
                {viewingOrder.status === 'draft' && (
                  <Button onClick={() => { setViewDialogOpen(false); handleEdit(viewingOrder); }} className="gap-2 bg-primary text-white hover:bg-primary/90 hover-elevate">
                    <Edit className="w-4 h-4" />
                    Editar Pedido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pedido de compra cadastrado</p>
                    <p className="text-sm">Clique em "Novo Pedido" para começar</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                  <TableCell className="font-medium" data-testid={`text-order-number-${order.id}`}>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell data-testid={`text-order-supplier-${order.id}`}>
                    {order.supplier?.name}
                  </TableCell>
                  <TableCell data-testid={`text-order-date-${order.id}`}>
                    {order.orderDate}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </TableCell>
                  <TableCell data-testid={`text-order-total-${order.id}`}>
                    R$ {parseFloat(order.totalAmount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(order)}
                        data-testid={`button-view-order-${order.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(order)}
                        disabled={order.status === 'cancelled'}
                        data-testid={`button-edit-order-${order.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(order.id)}
                        disabled={order.status !== 'draft'}
                        className="text-red-600 hover:text-red-800"
                        data-testid={`button-delete-order-${order.id}`}
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