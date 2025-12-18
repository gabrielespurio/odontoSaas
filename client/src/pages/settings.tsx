import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Settings2, Edit, MoreHorizontal, Trash2, FolderPlus, Bell, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCompanyFilter } from "@/contexts/company-context";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";
import type { User, ProcedureCategory, UserProfile } from "@/lib/types";
import WhatsAppSettings from "@/components/whatsapp/whatsapp-settings";

// User form schema
const userSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
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
  { id: "purchases", name: "Compras", description: "Gestão de compras e pedidos" },
  { id: "inventory", name: "Estoque", description: "Controle de estoque" },
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

  const onUserSubmit = (data: UserFormData) => {
    if (editingUser) {
      const updateData = { ...data };
      if (!data.password) {
        delete (updateData as any).password;
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
    switch (role) {
      case "admin":
        return "destructive";
      case "dentist":
        return "default";
      case "reception":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "dentist":
        return "Dentista";
      case "reception":
        return "Recepcionista";
      default:
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
            <p className="text-gray-600">Configure e personalize seu sistema OdontoSync</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="categories">
                <FolderPlus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Categorias</span>
              </TabsTrigger>
              <TabsTrigger value="profiles">
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Perfis</span>
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Notificações</span>
              </TabsTrigger>
            </TabsList>

            {/* Usuários Tab */}
            <TabsContent value="users" className="space-y-4 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Gerenciar Usuários</h3>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Perfil</TableHead>
                            <TableHead>Acesso</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersPagination.currentData.map((user: User) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {getRoleLabel(user.role)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={user.dataScope === "all" ? "default" : "secondary"}
                                >
                                  {user.dataScope === "all" ? "Todos os dados" : "Dados próprios"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteUser(user)}
                                      className="text-red-600"
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
                    {usersPagination.totalPages > 1 && (
                      <TablePagination
                        currentPage={usersPagination.currentPage}
                        totalPages={usersPagination.totalPages}
                        onPageChange={usersPagination.goToPage}
                      />
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* Categorias Tab */}
            <TabsContent value="categories" className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold">Categorias de Procedimentos</h3>
              {categoriesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories?.map((category) => (
                    <Card key={category.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{category.name}</h4>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Perfis Tab */}
            <TabsContent value="profiles" className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold">Perfis de Usuário</h3>
              {profilesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {profiles?.map((profile) => (
                    <Card key={profile.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{profile.name}</h4>
                          <p className="text-sm text-gray-600">{profile.description}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditProfile(profile)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Notificações Tab */}
            <TabsContent value="notifications" className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold mb-4">Configurações de Notificações</h3>
              <WhatsAppSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <Button
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
            setShowUserForm(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 rounded-full w-14 h-14 shadow-lg"
          data-testid="button-add-user"
        >
          <Plus className="w-6 h-6" />
        </Button>
        <Button
          onClick={() => {
            setEditingCategory(null);
            categoryForm.reset({
              name: "",
              description: "",
            });
            setShowCategoryForm(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 rounded-full w-14 h-14 shadow-lg"
          data-testid="button-add-category"
        >
          <Plus className="w-6 h-6" />
        </Button>
        <Button
          onClick={() => {
            setEditingProfile(null);
            profileForm.reset({
              name: "",
              description: "",
              modules: [],
            });
            setShowProfileForm(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 rounded-full w-14 h-14 shadow-lg"
          data-testid="button-add-profile"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* User Form Dialog */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="!max-w-4xl w-full">
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
                    <FormLabel>Nome</FormLabel>
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
                    <FormLabel>Senha {editingUser && "(deixe em branco para manter a atual)"}</FormLabel>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="dentist">Dentista</SelectItem>
                        <SelectItem value="reception">Recepcionista</SelectItem>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos os dados</SelectItem>
                        <SelectItem value="own">Apenas dados próprios</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="forcePasswordChange"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Forçar alteração de senha no próximo login</FormLabel>
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

      {/* Profile Form Dialog */}
      <Dialog open={showProfileForm} onOpenChange={setShowProfileForm}>
        <DialogContent className="!max-w-4xl w-full">
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
                      <Input {...field} />
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
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="modules"
                render={() => (
                  <FormItem>
                    <FormLabel>Módulos</FormLabel>
                    <div className="space-y-2">
                      {SYSTEM_MODULES.map((module) => (
                        <FormField
                          key={module.id}
                          control={profileForm.control}
                          name="modules"
                          render={({ field }) => {
                            const currentModules = field.value || [];
                            return (
                              <FormItem key={module.id} className="flex items-start space-x-3">
                                <FormControl>
                                  <Checkbox
                                    checked={currentModules.includes(module.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...currentModules, module.id]);
                                      } else {
                                        field.onChange(
                                          currentModules?.filter(
                                            (value) => value !== module.id
                                          )
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal">
                                    {module.name}
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    {module.description}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
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

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="!max-w-4xl w-full">
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
                    <FormLabel>Nome da Categoria</FormLabel>
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

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{userToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
