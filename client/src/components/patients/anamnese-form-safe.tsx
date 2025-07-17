import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Save, AlertCircle } from "lucide-react";

// Simplified form schema
const formSchema = z.object({
  patientId: z.number(),
  medicalTreatment: z.boolean().default(false),
  medications: z.string().default(""),
  allergies: z.string().default(""),
  previousDentalTreatment: z.boolean().default(false),
  painComplaint: z.string().default(""),
  hasHeartProblems: z.boolean().default(false),
  hasDiabetes: z.boolean().default(false),
  hasHypertension: z.boolean().default(false),
  isPregnant: z.boolean().default(false),
  smokingHabits: z.string().default(""),
  bleedingProblems: z.boolean().default(false),
  familyHistory: z.string().default(""),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  patientId: number;
}

const AnamneseFormSafe = memo(({ patientId }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data with better error handling
  const { data: anamnese, isLoading, error } = useQuery({
    queryKey: [`/api/anamnese/${patientId}`],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const response = await fetch(`/api/anamnese/${patientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required');
          }
          if (response.status === 404) {
            // Return null for non-existent anamnese (this is expected)
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Anamnese data received:', data);
        return data;
      } catch (err) {
        console.error('Anamnese fetch error:', err);
        throw err;
      }
    },
    enabled: !!patientId && patientId > 0,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Form with default values
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId,
      medicalTreatment: false,
      medications: "",
      allergies: "",
      previousDentalTreatment: false,
      painComplaint: "",
      hasHeartProblems: false,
      hasDiabetes: false,
      hasHypertension: false,
      isPregnant: false,
      smokingHabits: "",
      bleedingProblems: false,
      familyHistory: "",
    },
  });

  // Safe data normalizer
  const normalizeAnamneseData = useCallback((data: any): FormData => {
    if (!data) {
      return {
        patientId,
        medicalTreatment: false,
        medications: "",
        allergies: "",
        previousDentalTreatment: false,
        painComplaint: "",
        hasHeartProblems: false,
        hasDiabetes: false,
        hasHypertension: false,
        isPregnant: false,
        smokingHabits: "",
        bleedingProblems: false,
        familyHistory: "",
      };
    }

    try {
      return {
        patientId,
        medicalTreatment: Boolean(data.medicalTreatment),
        medications: String(data.medications || ""),
        allergies: String(data.allergies || ""),
        previousDentalTreatment: Boolean(data.previousDentalTreatment),
        painComplaint: String(data.painComplaint || ""),
        hasHeartProblems: Boolean(data.hasHeartProblems),
        hasDiabetes: Boolean(data.hasDiabetes),
        hasHypertension: Boolean(data.hasHypertension),
        isPregnant: Boolean(data.isPregnant),
        smokingHabits: String(data.smokingHabits || ""),
        bleedingProblems: Boolean(data.bleedingProblems),
        familyHistory: String(data.familyHistory || ""),
      };
    } catch (normalizeError) {
      console.error("Data normalization error:", normalizeError);
      return {
        patientId,
        medicalTreatment: false,
        medications: "",
        allergies: "",
        previousDentalTreatment: false,
        painComplaint: "",
        hasHeartProblems: false,
        hasDiabetes: false,
        hasHypertension: false,
        isPregnant: false,
        smokingHabits: "",
        bleedingProblems: false,
        familyHistory: "",
      };
    }
  }, [patientId]);

  // Update form when data is loaded
  useEffect(() => {
    if (anamnese !== undefined) {
      try {
        const normalizedData = normalizeAnamneseData(anamnese);
        form.reset(normalizedData);
      } catch (resetError) {
        console.error("Form reset error:", resetError);
      }
    }
  }, [anamnese, form, normalizeAnamneseData]);

  // Mutation for saving/updating
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        if (anamnese?.id) {
          // Update existing
          return await apiRequest("PUT", `/api/anamnese/${anamnese.id}`, data);
        } else {
          // Create new
          return await apiRequest("POST", "/api/anamnese", data);
        }
      } catch (mutationError) {
        console.error("Mutation error:", mutationError);
        throw mutationError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/anamnese/${patientId}`] });
      toast({
        title: "Sucesso",
        description: "Anamnese salva com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Save anamnese error:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar anamnese.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = useCallback((data: FormData) => {
    try {
      saveMutation.mutate(data);
    } catch (submitError) {
      console.error("Submit error:", submitError);
    }
  }, [saveMutation]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Anamnese do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    console.error("Anamnese error state:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Anamnese do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
            <p className="text-neutral-600 mb-2">Erro ao carregar anamnese</p>
            <p className="text-sm text-neutral-500">{error.message}</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main form render
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Anamnese do Paciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Medical Treatment */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="medicalTreatment"
                checked={form.watch("medicalTreatment")}
                onCheckedChange={(checked) => form.setValue("medicalTreatment", !!checked)}
              />
              <Label htmlFor="medicalTreatment">Está fazendo algum tratamento médico?</Label>
            </div>
            {form.watch("medicalTreatment") && (
              <Textarea
                placeholder="Descreva o tratamento..."
                value={form.watch("medications")}
                onChange={(e) => form.setValue("medications", e.target.value)}
              />
            )}
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label>Tem alguma alergia conhecida?</Label>
            <Textarea
              placeholder="Descreva as alergias..."
              value={form.watch("allergies")}
              onChange={(e) => form.setValue("allergies", e.target.value)}
            />
          </div>

          {/* Previous Dental Treatment */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="previousDentalTreatment"
                checked={form.watch("previousDentalTreatment")}
                onCheckedChange={(checked) => form.setValue("previousDentalTreatment", !!checked)}
              />
              <Label htmlFor="previousDentalTreatment">Já fez tratamento odontológico anterior?</Label>
            </div>
          </div>

          {/* Pain Complaint */}
          <div className="space-y-2">
            <Label>Queixa de dor atual</Label>
            <Textarea
              placeholder="Descreva a dor ou desconforto..."
              value={form.watch("painComplaint")}
              onChange={(e) => form.setValue("painComplaint", e.target.value)}
            />
          </div>

          {/* Health Conditions */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Condições de Saúde</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasHeartProblems"
                  checked={form.watch("hasHeartProblems")}
                  onCheckedChange={(checked) => form.setValue("hasHeartProblems", !!checked)}
                />
                <Label htmlFor="hasHeartProblems">Problemas cardíacos</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasDiabetes"
                  checked={form.watch("hasDiabetes")}
                  onCheckedChange={(checked) => form.setValue("hasDiabetes", !!checked)}
                />
                <Label htmlFor="hasDiabetes">Diabetes</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasHypertension"
                  checked={form.watch("hasHypertension")}
                  onCheckedChange={(checked) => form.setValue("hasHypertension", !!checked)}
                />
                <Label htmlFor="hasHypertension">Hipertensão</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPregnant"
                  checked={form.watch("isPregnant")}
                  onCheckedChange={(checked) => form.setValue("isPregnant", !!checked)}
                />
                <Label htmlFor="isPregnant">Gestante</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bleedingProblems"
                  checked={form.watch("bleedingProblems")}
                  onCheckedChange={(checked) => form.setValue("bleedingProblems", !!checked)}
                />
                <Label htmlFor="bleedingProblems">Problemas de coagulação</Label>
              </div>
            </div>
          </div>

          {/* Smoking Habits */}
          <div className="space-y-2">
            <Label>Hábitos de fumo</Label>
            <Textarea
              placeholder="Descreva os hábitos de fumo..."
              value={form.watch("smokingHabits")}
              onChange={(e) => form.setValue("smokingHabits", e.target.value)}
            />
          </div>

          {/* Family History */}
          <div className="space-y-2">
            <Label>Histórico familiar</Label>
            <Textarea
              placeholder="Descreva o histórico familiar relevante..."
              value={form.watch("familyHistory")}
              onChange={(e) => form.setValue("familyHistory", e.target.value)}
            />
          </div>

          <Button type="submit" disabled={saveMutation.isPending} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Anamnese"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
});

AnamneseFormSafe.displayName = "AnamneseFormSafe";

export default AnamneseFormSafe;