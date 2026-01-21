import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCompanyFilter } from "@/contexts/company-context";

type ProductCategory = {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
};

type Product = {
  id: number;
  companyId: number;
  categoryId: number;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  currentStock: string;
  minimumStock: string;
  maximumStock?: string;
  notes?: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  category: ProductCategory;
};

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  categoryId: z.number().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
  unit: z.enum(["unit", "box", "tube", "bottle", "pack", "roll", "kg", "g", "ml", "l"]).default("unit"),
  currentStock: z.number().min(0, "Estoque atual deve ser maior ou igual a zero").default(0),
  minimumStock: z.number().min(0, "Estoque mínimo deve ser maior ou igual a zero").default(5),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

const unitOptions = [
  { value: "unit", label: "Unidade" },
  { value: "box", label: "Caixa" },
  { value: "tube", label: "Tubo" },
  { value: "bottle", label: "Frasco" },
  { value: "pack", label: "Pacote" },
  { value: "roll", label: "Rolo" },
  { value: "kg", label: "Quilograma" },
  { value: "g", label: "Grama" },
  { value: "ml", label: "Mililitro" },
  { value: "l", label: "Litro" },
];

export default function StockProducts() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompanyFilter();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      categoryId: 0,
      description: "",
      unit: "unit",
      currentStock: 0,
      minimumStock: 5,
      notes: "",
      isActive: true,
    },
  });

  const { data: categories } = useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories", companyId],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId.toString());
      const response = await fetch(`/api/product-categories?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Falha ao carregar categorias');
      return response.json();
    }
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", selectedCategory, companyId],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append('categoryId', selectedCategory);
      if (companyId) params.append('companyId', companyId.toString());
      const response = await fetch(`/api/products?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Falha ao carregar produtos');
      return response.json();
    }
  });

  const createProductMutation = useMutation({
    mutationFn: (data: z.infer<typeof productSchema>) => {
      return apiRequest("POST", "/api/products", { ...data, companyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Sucesso", description: "Produto criado com sucesso!" });
      setShowForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao criar produto", variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof productSchema> }) => {
      return apiRequest("PUT", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
      setShowForm(false);
      setEditingProduct(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar produto", variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("DELETE", `/api/products/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Sucesso", description: "Produto excluído com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao excluir produto", variant: "destructive" });
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      categoryId: product.categoryId,
      description: product.description || "",
      unit: product.unit as any,
      currentStock: parseFloat(product.currentStock),
      minimumStock: parseFloat(product.minimumStock),
      notes: product.notes || "",
      isActive: product.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteProductMutation.mutate(id);
    }
  };

  const onSubmit = (data: z.infer<typeof productSchema>) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Produtos</h1>
          <p className="text-neutral-600">Gerencie os produtos do seu estoque</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingProduct(null); form.reset(); }} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-6xl w-full !max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Resina Composta A2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createProductMutation.isPending || updateProductMutation.isPending}>
                  {editingProduct ? "Atualizar" : "Salvar"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">Carregando...</TableCell></TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">Nenhum produto encontrado.</TableCell></TableRow>
              ) : (
                filteredProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category?.name}</TableCell>
                    <TableCell>{unitOptions.find(u => u.value === p.unit)?.label}</TableCell>
                    <TableCell>
                      <Badge variant={parseFloat(p.currentStock) <= parseFloat(p.minimumStock) ? "destructive" : "secondary"}>
                        {p.currentStock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(p)} className="gap-2 text-primary"><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(p.id)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
