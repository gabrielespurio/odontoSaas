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

  // Fetch data
  const { data: anamnese, isLoading, error } = useQuery({
    queryKey: [`/api/anamnese/${patientId}`],
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

    // Extract additionalQuestions safely
    const additionalQuestions = data.additionalQuestions || {};

    return {
      patientId: data.patientId || patientId,
      medicalTreatment: Boolean(data.medicalTreatment),
      medications: String(data.medications || ""),
      allergies: String(data.allergies || ""),
      previousDentalTreatment: Boolean(data.previousDentalTreatment),
      painComplaint: String(data.painComplaint || ""),
      hasHeartProblems: Boolean(additionalQuestions.hasHeartProblems),
      hasDiabetes: Boolean(additionalQuestions.hasDiabetes),
      hasHypertension: Boolean(additionalQuestions.hasHypertension),
      isPregnant: Boolean(additionalQuestions.isPregnant),
      smokingHabits: String(additionalQuestions.smokingHabits || ""),
      bleedingProblems: Boolean(additionalQuestions.bleedingProblems),
      familyHistory: String(additionalQuestions.familyHistory || ""),
    };
  }, [patientId]);

  // Update form when data loads
  useEffect(() => {
    if (anamnese) {
      try {
        const normalizedData = normalizeAnamneseData(anamnese);
        form.reset(normalizedData);
      } catch (error) {
        console.error("Error normalizing anamnese data:", error);
      }
    }
  }, [anamnese, form, normalizeAnamneseData]);

  // Transform form data for API
  const transformForAPI = useCallback((data: FormData) => {
    return {
      patientId: data.patientId,
      medicalTreatment: data.medicalTreatment,
      medications: data.medications,
      allergies: data.allergies,
      previousDentalTreatment: data.previousDentalTreatment,
      painComplaint: data.painComplaint,
      additionalQuestions: {
        hasHeartProblems: data.hasHeartProblems,
        hasDiabetes: data.hasDiabetes,
        hasHypertension: data.hasHypertension,
        isPregnant: data.isPregnant,
        smokingHabits: data.smokingHabits,
        bleedingProblems: data.bleedingProblems,
        familyHistory: data.familyHistory,
      },
    };
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/anamnese", transformForAPI(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/anamnese/${patientId}`] });
      toast({
        title: "Sucesso",
        description: "Anamnese criada com sucesso",
      });
    },
    onError: (error) => {
      console.error("Create anamnese error:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar anamnese",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("PUT", `/api/anamnese/${anamnese?.id}`, transformForAPI(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/anamnese/${patientId}`] });
      toast({
        title: "Sucesso",
        description: "Anamnese atualizada com sucesso",
      });
    },
    onError: (error) => {
      console.error("Update anamnese error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar anamnese",
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = useCallback((data: FormData) => {
    try {
      if (anamnese?.id) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Erro",
        description: "Erro ao processar formulário",
        variant: "destructive",
      });
    }
  }, [anamnese?.id, createMutation, updateMutation, toast]);

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
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
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
            <p className="text-neutral-600">Erro ao carregar anamnese</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get current form values safely
  const currentValues = form.getValues();

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
          {/* Medical History */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Histórico Médico</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="medicalTreatment"
                checked={currentValues.medicalTreatment}
                onCheckedChange={(checked) => form.setValue("medicalTreatment", Boolean(checked))}
              />
              <Label htmlFor="medicalTreatment" className="text-sm leading-relaxed">
                Está em tratamento médico atualmente?
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications" className="text-sm font-medium">
                Medicamentos em uso
              </Label>
              <Textarea
                id="medications"
                value={currentValues.medications}
                onChange={(e) => form.setValue("medications", e.target.value)}
                placeholder="Liste os medicamentos que está tomando"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies" className="text-sm font-medium">
                Alergias
              </Label>
              <Textarea
                id="allergies"
                value={currentValues.allergies}
                onChange={(e) => form.setValue("allergies", e.target.value)}
                placeholder="Descreva alergias conhecidas"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="previousDentalTreatment"
                checked={currentValues.previousDentalTreatment}
                onCheckedChange={(checked) => form.setValue("previousDentalTreatment", Boolean(checked))}
              />
              <Label htmlFor="previousDentalTreatment" className="text-sm leading-relaxed">
                Já fez tratamento odontológico anteriormente?
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="painComplaint" className="text-sm font-medium">
                Queixa de dor
              </Label>
              <Textarea
                id="painComplaint"
                value={currentValues.painComplaint}
                onChange={(e) => form.setValue("painComplaint", e.target.value)}
                placeholder="Descreva qualquer dor ou desconforto"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Additional Questions */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold text-neutral-900">Informações Complementares</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasHeartProblems"
                  checked={currentValues.hasHeartProblems}
                  onCheckedChange={(checked) => form.setValue("hasHeartProblems", Boolean(checked))}
                />
                <Label htmlFor="hasHeartProblems" className="text-sm leading-relaxed">
                  Possui problemas cardíacos?
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasDiabetes"
                  checked={currentValues.hasDiabetes}
                  onCheckedChange={(checked) => form.setValue("hasDiabetes", Boolean(checked))}
                />
                <Label htmlFor="hasDiabetes" className="text-sm leading-relaxed">
                  É diabético(a)?
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasHypertension"
                  checked={currentValues.hasHypertension}
                  onCheckedChange={(checked) => form.setValue("hasHypertension", Boolean(checked))}
                />
                <Label htmlFor="hasHypertension" className="text-sm leading-relaxed">
                  Possui hipertensão?
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPregnant"
                  checked={currentValues.isPregnant}
                  onCheckedChange={(checked) => form.setValue("isPregnant", Boolean(checked))}
                />
                <Label htmlFor="isPregnant" className="text-sm leading-relaxed">
                  Está grávida?
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bleedingProblems"
                  checked={currentValues.bleedingProblems}
                  onCheckedChange={(checked) => form.setValue("bleedingProblems", Boolean(checked))}
                />
                <Label htmlFor="bleedingProblems" className="text-sm leading-relaxed">
                  Possui problemas de coagulação?
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smokingHabits" className="text-sm font-medium">
                Hábitos de fumo
              </Label>
              <Textarea
                id="smokingHabits"
                value={currentValues.smokingHabits}
                onChange={(e) => form.setValue("smokingHabits", e.target.value)}
                placeholder="Descreva hábitos de fumo"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyHistory" className="text-sm font-medium">
                Histórico familiar relevante
              </Label>
              <Textarea
                id="familyHistory"
                value={currentValues.familyHistory}
                onChange={(e) => form.setValue("familyHistory", e.target.value)}
                placeholder="Descreva problemas de saúde na família"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Important Alerts */}
          {(currentValues.allergies || currentValues.hasHeartProblems || currentValues.hasDiabetes || currentValues.bleedingProblems) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                    Atenção - Informações importantes identificadas:
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {currentValues.allergies && <li>• Paciente possui alergias relatadas</li>}
                    {currentValues.hasHeartProblems && <li>• Paciente possui problemas cardíacos</li>}
                    {currentValues.hasDiabetes && <li>• Paciente é diabético</li>}
                    {currentValues.bleedingProblems && <li>• Paciente possui problemas de coagulação</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar Anamnese"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

AnamneseFormSafe.displayName = "AnamneseFormSafe";

export { AnamneseFormSafe as AnamneseForm };