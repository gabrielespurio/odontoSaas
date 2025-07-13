import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Clock,
  DollarSign,
  Wrench,
  Filter
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Procedure, ProcedureCategory } from "@/lib/types";

const procedureSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  duration: z.number().min(15, "Duração mínima é 15 minutos"),
  category: z.string().min(1, "Categoria é obrigatória"),
});

type ProcedureFormData = z.infer<typeof procedureSchema>;

export default function Procedures() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: procedures, isLoading } = useQuery<Procedure[]>({
    queryKey: ["/api/procedures"],
  });

  const { data: categories } = useQuery<ProcedureCategory[]>({
    queryKey: ["/api/procedure-categories"],
  });

  const form = useForm<ProcedureFormData>({
    resolver: zodResolver(procedureSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      duration: 30,
      category: "",
    },
  });

  const createProcedureMutation = useMutation({
    mutationFn: (data: ProcedureFormData) => apiRequest("POST", "/api/procedures", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
      toast({
        title: "Sucesso",
        description: "Procedimento criado com sucesso",
      });
      handleFormReset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar procedimento",
        variant: "destructive",
      });
    },
  });

  const updateProcedureMutation = useMutation({
    mutationFn: (data: ProcedureFormData) => apiRequest("PUT", `/api/procedures/${editingProcedure?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
      toast({
        title: "Sucesso",
        description: "Procedimento atualizado com sucesso",
      });
      handleFormReset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar procedimento",
        variant: "destructive",
      });
    },
  });

  const deleteProcedureMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/procedures/${id}`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedures"] });
      toast({
        title: "Sucesso",
        description: "Procedimento removido com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover procedimento",
        variant: "destructive",
      });
    },
  });

  const handleFormReset = () => {
    setShowForm(false);
    setEditingProcedure(null);
    form.reset();
  };

  const onSubmit = (data: ProcedureFormData) => {
    if (editingProcedure) {
      updateProcedureMutation.mutate(data);
    } else {
      createProcedureMutation.mutate(data);
    }
  };

  const handleEdit = (procedure: Procedure) => {
    setEditingProcedure(procedure);
    form.reset({
      name: procedure.name,
      description: procedure.description || "",
      price: procedure.price,
      duration: procedure.duration,
      category: procedure.category,
    });
    setShowForm(true);
  };

  const handleDelete = (procedure: Procedure) => {
    if (confirm(`Tem certeza que deseja remover o procedimento "${procedure.name}"?`)) {
      deleteProcedureMutation.mutate(procedure.id);
    }
  };

  const formatPrice = (price: string) => {
    return `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  };

  const getCategoryColor = (category: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-red-100 text-red-800",
      "bg-yellow-100 text-yellow-800",
      "bg-purple-100 text-purple-800",
      "bg-indigo-100 text-indigo-800",
      "bg-pink-100 text-pink-800",
      "bg-orange-100 text-orange-800",
      "bg-teal-100 text-teal-800",
      "bg-cyan-100 text-cyan-800",
    ];
    
    // Generate a consistent color index based on category name
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % colors.length;
    return colors[colorIndex];
  };

  const filteredProcedures = procedures?.filter(procedure => 
    procedure.isActive &&
    (selectedCategory === "all" || procedure.category === selectedCategory) &&
    (!search || 
     procedure.name.toLowerCase().includes(search.toLowerCase()) ||
     procedure.description?.toLowerCase().includes(search.toLowerCase()) ||
     procedure.category.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Procedimentos</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProcedure(null)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Procedimento
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[96vw] max-w-2xl h-[94vh] flex flex-col p-3 sm:p-6 mx-[2vw] sm:mx-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProcedure ? "Editar Procedimento" : "Novo Procedimento"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Procedimento *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Ex: Limpeza Dentária"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={form.watch("category")} 
                    onValueChange={(value) => form.setValue("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.filter(cat => cat.isActive).map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-red-600">{form.formState.errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...form.register("price")}
                    placeholder="0,00"
                  />
                  {form.formState.errors.price && (
                    <p className="text-sm text-red-600">{form.formState.errors.price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    {...form.register("duration", { valueAsNumber: true })}
                    placeholder="30"
                  />
                  {form.formState.errors.duration && (
                    <p className="text-sm text-red-600">{form.formState.errors.duration.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Descrição detalhada do procedimento"
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleFormReset} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProcedureMutation.isPending || updateProcedureMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {createProcedureMutation.isPending || updateProcedureMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Buscar procedimentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories?.filter(cat => cat.isActive).map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Procedures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProcedures?.map((procedure) => (
          <Card key={procedure.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{procedure.name}</CardTitle>
                  <Badge className={getCategoryColor(procedure.category)}>
                    {procedure.category}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(procedure)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(procedure)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {procedure.description && (
                <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                  {procedure.description}
                </p>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-green-600">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="font-semibold">{formatPrice(procedure.price)}</span>
                  </div>
                  <div className="flex items-center text-neutral-600">
                    <Clock className="w-4 h-4 mr-1" />
                    <span className="text-sm">{formatDuration(procedure.duration)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!filteredProcedures || filteredProcedures.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">Nenhum procedimento encontrado</p>
              <p className="text-sm text-neutral-500 mt-2">
                {search || selectedCategory !== "all" 
                  ? "Tente ajustar os filtros de busca" 
                  : "Cadastre o primeiro procedimento"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      {filteredProcedures && filteredProcedures.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{filteredProcedures.length}</p>
                <p className="text-sm text-neutral-600">Procedimentos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(
                    filteredProcedures
                      .reduce((sum, proc) => sum + Number(proc.price), 0)
                      .toString()
                  )}
                </p>
                <p className="text-sm text-neutral-600">Valor Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatDuration(
                    Math.round(
                      filteredProcedures
                        .reduce((sum, proc) => sum + proc.duration, 0) / filteredProcedures.length
                    )
                  )}
                </p>
                <p className="text-sm text-neutral-600">Duração Média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
