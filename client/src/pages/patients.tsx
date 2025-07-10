import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Eye, Edit, Wrench, Filter, MoreHorizontal, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PatientForm from "@/components/patients/patient-form";
import type { Patient } from "@/lib/types";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { search: debouncedSearch }],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const url = debouncedSearch ? `/api/patients?search=${encodeURIComponent(debouncedSearch)}` : "/api/patients";
      
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

  console.log("Patients data:", patients);
  console.log("Loading:", isLoading);
  console.log("Error:", error);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPatient(null);
  };

  const deletePatientMutation = useMutation({
    mutationFn: (patientId: number) => apiRequest("DELETE", `/api/patients/${patientId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Sucesso",
        description: "Paciente excluído com sucesso",
      });
      setShowDeleteModal(false);
      setDeletingPatient(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Erro ao excluir paciente";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (patient: Patient) => {
    setDeletingPatient(patient);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingPatient) {
      deletePatientMutation.mutate(deletingPatient.id);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeletingPatient(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Pacientes</h1>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPatient(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPatient ? "Editar Paciente" : "Novo Paciente"}
              </DialogTitle>
            </DialogHeader>
            <PatientForm
              patient={editingPatient}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
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
                placeholder="Buscar por nome, CPF ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="md:w-32">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="responsive-table-container">
            <table className="responsive-table">
              <thead className="bg-neutral-50">
                <tr className="border-b">
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Paciente</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">CPF</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Telefone</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Data Cadastro</th>
                  <th className="text-left py-4 px-6 font-medium text-neutral-700">Status</th>
                  <th className="text-center py-4 px-6 font-medium text-neutral-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {patients?.map((patient) => (
                  <tr key={patient.id} className="border-b hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                          {getInitials(patient.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-neutral-900 truncate">{patient.name}</p>
                          <p className="text-sm text-neutral-600 truncate">{patient.email || 'Email não informado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-neutral-900 font-mono text-sm">{formatCPF(patient.cpf)}</td>
                    <td className="py-4 px-6 text-neutral-900 font-mono text-sm">{formatPhone(patient.phone)}</td>
                    <td className="py-4 px-6 text-neutral-900 text-sm">{formatDate(patient.createdAt)}</td>
                    <td className="py-4 px-6">
                      <Badge className={patient.isActive ? "status-confirmed" : "status-cancelled"}>
                        {patient.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/patients/${patient.id}`} className="flex items-center cursor-pointer">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="flex items-center cursor-pointer text-red-600"
                            onClick={() => handleDeleteClick(patient)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {(!patients || patients.length === 0) && (
            <div className="text-center py-8">
              <p className="text-neutral-600">Nenhum paciente encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-lg font-semibold text-neutral-900">
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-neutral-600 mb-2">
              Tem certeza que deseja excluir o paciente:
            </p>
            <p className="font-medium text-neutral-900 text-lg">
              {deletingPatient?.name}
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDeleteCancel}
              disabled={deletePatientMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={deletePatientMutation.isPending}
            >
              {deletePatientMutation.isPending ? "Excluindo..." : "Sim, quero excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
