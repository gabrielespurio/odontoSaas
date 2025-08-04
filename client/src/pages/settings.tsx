import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Settings2, Edit, MoreHorizontal, Trash2, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCompanyFilter } from "@/contexts/company-context";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";
import type { User, ProcedureCategory, UserProfile } from "@/lib/types";

// User form schema
const userSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.string().min(1, "Selecione um perfil"),
  dataScope: z.enum(["all", "own"], { required_error: "Selecione o escopo de dados" }),
  forcePasswordChange: z.boolean().optional(),
});

// Category form schema
const categorySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
});

// Profile form schema
const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  modules: z.array(z.string()).min(1, "Selecione pelo menos um módulo"),
});

type UserFormData = z.infer<typeof userSchema>;
type CategoryFormData = z.infer<typeof categorySchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

// Available system modules
const SYSTEM_MODULES = [
  { id: "dashboard", name: "Dashboard", description: "Visão geral do sistema" },
  { id: "patients", name: "Pacientes", description: "Gestão de pacientes" },
  { id: "schedule", name: "Agenda", description: "Agendamento de consultas" },
  { id: "consultations", name: "Atendimentos", description: "Registro de consultas" },
  { id: "procedures", name: "Procedimentos", description: "Gestão de procedimentos" },
  { id: "financial", name: "Financeiros", description: "Controle financeiro" },
  { id: "reports", name: "Relatórios", description: "Relatórios e estatísticas" },
  { id: "settings", name: "Configurações", description: "Configurações do sistema" },
];

export default function Settings() {
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCategory, setEditingCategory] = useState<ProcedureCategory | null>(null);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { toast } = useToast();
  const companyFilter = useCompanyFilter();

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users", { companyId: companyFilter }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (companyFilter) {
        params.append('companyId', companyFilter.toString());
      }
      
      const url = `/api/users${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  // Paginação para usuários
  const usersPagination = usePagination({
    data: users || [],
    itemsPerPage: 10,
  });

  // Fetch procedure categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<ProcedureCategory[]>({
    queryKey: ["/api/procedure-categories", { companyId: companyFilter }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (companyFilter) {
        params.append('companyId', companyFilter.toString());
      }
      
      const url = `/api/procedure-categories${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  // Fetch user profiles
  const { data: profiles, isLoading: profilesLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/user-profiles", { companyId: companyFilter }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      
      if (companyFilter) {
        params.append('companyId', companyFilter.toString());
      }
      
      const url = `/api/user-profiles${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  // User form
  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "",
      dataScope: "all",
      forcePasswordChange: false,
    },
  });

  // Category form
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      description: "",
      modules: [],
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowUserForm(false);
      userForm.reset();
      toast({
        title: "Usuário criado com sucesso",
        description: "O novo usuário foi adicionado ao sistema.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar usuário",
        description: "Ocorreu um erro ao criar o usuário.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: Partial<UserFormData>) => 
      apiRequest("PUT", `/api/users/${editingUser?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowUserForm(false);
      setEditingUser(null);
      userForm.reset();
      toast({
        title: "Usuário atualizado com sucesso",
        description: "As informações do usuário foram atualizadas.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar usuário",
        description: "Ocorreu um erro ao atualizar o usuário.",
        variant: "destructive",
      });
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) => apiRequest("POST", "/api/procedure-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-categories"] });
      setShowCategoryForm(false);
      categoryForm.reset();
      toast({
        title: "Categoria criada com sucesso",
        description: "A nova categoria foi adicionada ao sistema.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar categoria",
        description: "Ocorreu um erro ao criar a categoria.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest("DELETE", `/api/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowDeleteUserDialog(false);
      setUserToDelete(null);
      toast({
        title: "Usuário excluído com sucesso",
        description: "O usuário foi removido do sistema.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir usuário",
        description: "Ocorreu um erro ao excluir o usuário.",
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) => 
      apiRequest("PUT", `/api/procedure-categories/${editingCategory?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procedure-categories"] });
      setShowCategoryForm(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: "Categoria atualizada com sucesso",
        description: "A categoria foi atualizada.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar categoria",
        description: "Ocorreu um erro ao atualizar a categoria.",
        variant: "destructive",
      });
    },
  });

  const onUserSubmit = (data: UserFormData) => {
    if (editingUser) {
      const updateData = { ...data };
      if (!data.password) {
        delete updateData.password;
      }
      updateUserMutation.mutate(updateData);
    } else {
      createUserMutation.mutate(data);
    }
  };

  const onCategorySubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate(data);
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => apiRequest("POST", "/api/user-profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profiles"] });
      setShowProfileForm(false);
      profileForm.reset();
      toast({
        title: "Perfil criado com sucesso",
        description: "O novo perfil foi adicionado ao sistema.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar perfil",
        description: "Ocorreu um erro ao criar o perfil.",
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => 
      apiRequest("PUT", `/api/user-profiles/${editingProfile?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-profiles"] });
      setShowProfileForm(false);
      setEditingProfile(null);
      profileForm.reset();
      toast({
        title: "Perfil atualizado com sucesso",
        description: "O perfil foi atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar o perfil.",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    if (editingProfile) {
      updateProfileMutation.mutate(data);
    } else {
      createProfileMutation.mutate(data);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.reset({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      dataScope: user.dataScope || "all",
      forcePasswordChange: user.forcePasswordChange || false,
    });
    setShowUserForm(true);
  };

  const handleEditCategory = (category: ProcedureCategory) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
    });
    setShowCategoryForm(true);
  };

  const handleEditProfile = (profile: UserProfile) => {
    setEditingProfile(profile);
    profileForm.reset({
      name: profile.name,
      description: profile.description || "",
      modules: Array.isArray(profile.modules) ? profile.modules : [],
    });
    setShowProfileForm(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteUserDialog(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    // Check if it's a standard role or custom profile
    switch (role) {
      case "admin":
        return "destructive";
      case "dentist":
        return "default";
      case "reception":
        return "secondary";
      default:
        // For custom profiles, use a neutral variant
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    // Check if it's a standard role or custom profile
    switch (role) {
      case "admin":
        return "Administrador";
      case "dentist":
        return "Dentista";
      case "reception":
        return "Recepcionista";
      default:
        // For custom profiles, return the profile name as-is
        return role;
    }
  };

  return (
    <div className="page-container">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Settings2 className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600">Gerencie usuários e categorias do sistema</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Usuários</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="profiles" className="flex items-center gap-2 text-sm">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Perfis</span>
            <span className="sm:hidden">Perf.</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2 text-sm">
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Categorias</span>
            <span className="sm:hidden">Cat.</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Usuários do Sistema</CardTitle>
                  <CardDescription>
                    Gerencie dentistas, recepcionistas e administradores
                  </CardDescription>
                </div>
                <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
                      onClick={() => {
                        setEditingUser(null);
                        userForm.reset({
                          name: "",
                          email: "",
                          password: "",
                          role: "",
                          dataScope: "all",
                          forcePasswordChange: false,
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingUser ? "Editar Usuário" : "Novo Usuário"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                        <FormField
                          control={userForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha"}
                              </FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Perfil</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um perfil" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {profiles?.map((profile) => (
                                    <SelectItem key={profile.id} value={profile.name}>
                                      {profile.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="dataScope"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Escopo de Dados</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o escopo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="all">
                                    Todos os dados da clínica
                                  </SelectItem>
                                  <SelectItem value="own">
                                    Apenas dados próprios
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Define se o usuário pode visualizar dados de todos os dentistas ou apenas os próprios
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="forcePasswordChange"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Solicitar alteração de senha no primeiro acesso
                                </FormLabel>
                                <FormDescription>
                                  O usuário será obrigado a trocar a senha no primeiro login
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowUserForm(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            className="bg-teal-600 hover:bg-teal-700"
                            disabled={createUserMutation.isPending || updateUserMutation.isPending}
                          >
                            {editingUser ? "Atualizar" : "Criar"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Acesso</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersPagination.currentData.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {getRoleLabel(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.dataScope === "all" ? "default" : "outline"}>
                                {user.dataScope === "all" ? "Todos os dados" : "Dados próprios"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.isActive ? "default" : "secondary"}>
                                {user.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {users?.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Nenhum usuário encontrado
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Comece criando o primeiro usuário do sistema.
                        </p>
                        <Button onClick={() => setShowUserForm(true)} className="bg-teal-600 hover:bg-teal-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Primeiro Usuário
                        </Button>
                      </div>
                    ) : (
                      users?.map((user) => (
                        <Card key={user.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{user.name}</h3>
                                <p className="text-sm text-gray-600">@{user.username}</p>
                                <p className="text-sm text-gray-600">{user.email}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteUser(user)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {getRoleLabel(user.role)}
                                </Badge>
                                <Badge variant={user.isActive ? "default" : "secondary"}>
                                  {user.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Perfis de Usuário</CardTitle>
                  <CardDescription>
                    Gerencie perfis com módulos específicos do sistema
                  </CardDescription>
                </div>
                <Dialog open={showProfileForm} onOpenChange={setShowProfileForm}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
                      onClick={() => {
                        setEditingProfile(null);
                        profileForm.reset({
                          name: "",
                          description: "",
                          modules: [],
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Perfil
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProfile ? "Editar Perfil" : "Novo Perfil"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Perfil</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Dentista Clínico" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Descrição opcional do perfil" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="modules"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Módulos do Sistema</FormLabel>
                              <FormDescription>
                                Selecione os módulos que este perfil terá acesso
                              </FormDescription>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {SYSTEM_MODULES.map((module) => (
                                  <div key={module.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                    <Checkbox
                                      checked={field.value?.includes(module.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentModules = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentModules, module.id]);
                                        } else {
                                          field.onChange(currentModules.filter(m => m !== module.id));
                                        }
                                      }}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{module.name}</div>
                                      <div className="text-xs text-gray-600">{module.description}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowProfileForm(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            className="bg-teal-600 hover:bg-teal-700"
                            disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
                          >
                            {editingProfile ? "Atualizar" : "Criar"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {profilesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Módulos</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles?.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">{profile.name}</TableCell>
                            <TableCell>{profile.description || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(Array.isArray(profile.modules) ? profile.modules : []).slice(0, 3).map((moduleId) => {
                                  const module = SYSTEM_MODULES.find(m => m.id === moduleId);
                                  return module ? (
                                    <Badge key={moduleId} variant="outline" className="text-xs">
                                      {module.name}
                                    </Badge>
                                  ) : null;
                                })}
                                {Array.isArray(profile.modules) && profile.modules.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{profile.modules.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={profile.isActive ? "default" : "secondary"}>
                                {profile.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditProfile(profile)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {profiles?.length === 0 ? (
                      <div className="text-center py-8">
                        <Settings2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Nenhum perfil encontrado
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Comece criando o primeiro perfil de usuário.
                        </p>
                        <Button onClick={() => setShowProfileForm(true)} className="bg-teal-600 hover:bg-teal-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Primeiro Perfil
                        </Button>
                      </div>
                    ) : (
                      profiles?.map((profile) => (
                        <Card key={profile.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{profile.name}</h3>
                                <p className="text-sm text-gray-600">{profile.description || "Sem descrição"}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditProfile(profile)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-2">Módulos:</p>
                                <div className="flex flex-wrap gap-1">
                                  {(Array.isArray(profile.modules) ? profile.modules : []).slice(0, 4).map((moduleId) => {
                                    const module = SYSTEM_MODULES.find(m => m.id === moduleId);
                                    return module ? (
                                      <Badge key={moduleId} variant="outline" className="text-xs">
                                        {module.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                  {Array.isArray(profile.modules) && profile.modules.length > 4 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{profile.modules.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <Badge variant={profile.isActive ? "default" : "secondary"}>
                                  {profile.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Categorias de Procedimentos</CardTitle>
                  <CardDescription>
                    Gerencie as categorias utilizadas nos procedimentos
                  </CardDescription>
                </div>
                <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
                      onClick={() => {
                        setEditingCategory(null);
                        categoryForm.reset({
                          name: "",
                          description: "",
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <FormControl>
                                <Textarea {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowCategoryForm(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            className="bg-teal-600 hover:bg-teal-700"
                            disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                          >
                            {editingCategory ? "Atualizar" : "Criar"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories?.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={category.isActive ? "default" : "secondary"}>
                                {category.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {categories?.length === 0 ? (
                      <div className="text-center py-8">
                        <FolderPlus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Nenhuma categoria encontrada
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Comece criando a primeira categoria de procedimentos.
                        </p>
                        <Button onClick={() => setShowCategoryForm(true)} className="bg-teal-600 hover:bg-teal-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Primeira Categoria
                        </Button>
                      </div>
                    ) : (
                      categories?.map((category) => (
                        <Card key={category.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{category.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {category.description || "Sem descrição"}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCategory(category)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-start">
                              <Badge variant={category.isActive ? "default" : "secondary"}>
                                {category.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-[400px] mx-4 p-4 sm:mx-auto sm:w-[400px]">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-base font-semibold">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              Excluir o usuário <strong>{userToDelete?.name}</strong>?
              <br />
              <span className="text-xs text-gray-500 mt-1 block">
                Esta ação não pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4 space-y-2 sm:space-y-0">
            <AlertDialogCancel className="text-sm px-3 py-2 w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-sm px-3 py-2 w-full sm:w-auto"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}