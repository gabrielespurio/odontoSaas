import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function Unauthorized() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Acesso Negado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Você não tem permissão para acessar esta página. Entre em contato com o administrador do sistema para obter acesso.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full"
          >
            Voltar
          </Button>
          
          <Button 
            onClick={logout}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            Fazer Logout
          </Button>
        </div>
      </div>
    </div>
  );
}