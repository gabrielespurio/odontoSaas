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
  { id: "reports", name: "Relatórios", description: "Relatórios e estatísticas" },
  { id: "settings", name: "Configurações", description: "Configurações do sistema" },
];

// Settings categories configuration
const SETTINGS_CATEGORIES = [
  {
    id: 'users',
    title: 'Usuários',
    description: 'Gerencie usuários e permissões',
    icon: Users,
    sections: [
      { id: 'users', title: 'Usuários do Sistema', description: 'Gerenciar dentistas, recepcionistas e administradores' },
      { id: 'profiles', title: 'Perfis de Usuário', description: 'Criar e editar perfis personalizados' }
    ]
  },
  {
    id: 'procedures',
    title: 'Procedimentos',
    description: 'Configure procedimentos e categorias',
    icon: FolderPlus,
    sections: [
      { id: 'categories', title: 'Categorias', description: 'Organizar procedimentos por categoria' }
    ]
  },
  {
    id: 'notifications',
    title: 'Notificações',
    description: 'Configure alertas e lembretes',
    icon: Bell,
    sections: [
      { id: 'whatsapp', title: 'WhatsApp', description: 'Configurações de envio de mensagens' },
      { id: 'email', title: 'Email', description: 'Configurações de email' }
    ]
  }
];

export default function Settings() {
  const [selectedCategory, setSelectedCategory] = useState('notifications');
  const [selectedSection, setSelectedSection] = useState('whatsapp');
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

  // Handle section navigation
  const handleSectionChange = (categoryId: string, sectionId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSection(sectionId);
  };

  // Get current category and section
  const currentCategory = SETTINGS_CATEGORIES.find(cat => cat.id === selectedCategory);
  const currentSection = currentCategory?.sections.find(sec => sec.id === selectedSection);

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Categorias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SETTINGS_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.id;
                
                return (
                  <div key={category.id} className="space-y-1">
                    <button
                      onClick={() => handleSectionChange(category.id, category.sections[0].id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        isActive 
                          ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{category.title}</div>
                        <div className={`text-xs truncate ${isActive ? 'text-teal-600' : 'text-gray-500'}`}>
                          {category.description}
                        </div>
                      </div>
                    </button>
                    
                    {/* Subcategories/Sections */}
                    {isActive && category.sections.length > 1 && (
                      <div className="ml-8 space-y-1">
                        {category.sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setSelectedSection(section.id)}
                            className={`w-full text-left p-2 rounded text-sm transition-colors ${
                              selectedSection === section.id
                                ? 'text-teal-700 bg-teal-25 font-medium'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            {section.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {currentCategory && <currentCategory.icon className="w-5 h-5 text-teal-600" />}
                    {currentSection?.title || currentCategory?.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {currentSection?.description || currentCategory?.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Content based on selected section */}
              {selectedSection === 'users' && (
                <div className="space-y-4">
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
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usersPagination.currentData.map((user: User) => (
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
                                  <Badge 
                                    variant={user.dataScope === "all" ? "default" : "secondary"}
                                  >
                                    {user.dataScope === "all" ? "Todos os dados" : "Dados próprios"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="default">Ativo</Badge>
                                </TableCell>
                                <TableCell className="text-right">
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
                      
                      {/* Pagination */}
                      <TablePagination
                        currentPage={usersPagination.currentPage}
                        totalPages={usersPagination.totalPages}
                        onPageChange={usersPagination.goToPage}
                        totalItems={usersPagination.totalItems}
                      />
                    </>
                  )}
                </div>
              )}

              {selectedSection === 'profiles' && (
                <div className="space-y-4">
                  {profilesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {profiles?.map((profile) => (
                        <Card key={profile.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{profile.name}</h3>
                              <p className="text-sm text-gray-600">{profile.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {Array.isArray(profile.modules) ? profile.modules.length : 0} módulos
                              </p>
                            </div>
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
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedSection === 'categories' && (
                <div className="space-y-4">
                  {categoriesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {categories?.map((category) => (
                        <Card key={category.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{category.name}</h3>
                              <p className="text-sm text-gray-600">{category.description}</p>
                            </div>
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
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(selectedSection === 'whatsapp' || selectedSection === 'notifications') && (
                <div>
                  <WhatsAppSettings />
                </div>
              )}

              {/* Placeholder for future sections */}
              {!['users', 'profiles', 'categories', 'whatsapp', 'notifications'].includes(selectedSection) && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Settings2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Em Desenvolvimento</h3>
                  <p className="text-gray-600">
                    Esta seção estará disponível em breve.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Form Dialog */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
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

      {/* Profile Form Dialog */}
      <Dialog open={showProfileForm} onOpenChange={setShowProfileForm}>
        <DialogContent className="sm:max-w-[600px]">
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
                    <FormLabel>Módulos do Sistema</FormLabel>
                    <FormDescription>
                      Selecione os módulos que este perfil terá acesso
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {SYSTEM_MODULES.map((module) => (
                        <FormField
                          key={module.id}
                          control={profileForm.control}
                          name="modules"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={module.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(module.id)}
                                    onCheckedChange={(checked) => {
                                      const currentModules = field.value || [];
                                      return checked
                                        ? field.onChange([...currentModules, module.id])
                                        : field.onChange(
                                            currentModules?.filter(
                                              (value) => value !== module.id
                                            )
                                          );
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

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {selectedSection === 'users' && (
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
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}
        {selectedSection === 'profiles' && (
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
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}
        {selectedSection === 'categories' && (
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
          >
            <Plus className="w-6 h-6" />
          </Button>
        )}
      </div>
    </div>
  );
}