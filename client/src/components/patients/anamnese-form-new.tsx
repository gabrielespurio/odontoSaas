import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Save, AlertCircle } from "lucide-react";

// Safe type definitions
interface AdditionalQuestions {
  hasHeartProblems?: boolean;
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  isPregnant?: boolean;
  smokingHabits?: string;
  bleedingProblems?: boolean;
  familyHistory?: string;
}

interface AnamneseData {
  id?: number;
  patientId: number;
  medicalTreatment: boolean;
  medications?: string;
  allergies?: string;
  previousDentalTreatment: boolean;
  painComplaint?: string;
  additionalQuestions?: AdditionalQuestions;
}

// Form schema
const anamneseFormSchema = z.object({
  patientId: z.number(),
  medicalTreatment: z.boolean(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  previousDentalTreatment: z.boolean(),
  painComplaint: z.string().optional(),
  additionalQuestions: z.object({
    hasHeartProblems: z.boolean().optional(),
    hasDiabetes: z.boolean().optional(),
    hasHypertension: z.boolean().optional(),
    isPregnant: z.boolean().optional(),
    smokingHabits: z.string().optional(),
    bleedingProblems: z.boolean().optional(),
    familyHistory: z.string().optional(),
  }).optional(),
});

type AnamneseFormData = z.infer<typeof anamneseFormSchema>;

interface AnamneseFormProps {
  patientId: number;
}

// Safe data normalizer
const safeNormalizeAdditionalQuestions = (data: any): AdditionalQuestions => {
  const defaults: AdditionalQuestions = {
    hasHeartProblems: false,
    hasDiabetes: false,
    hasHypertension: false,
    isPregnant: false,
    smokingHabits: "",
    bleedingProblems: false,
    familyHistory: "",
  };

  if (!data || typeof data !== 'object') {
    return defaults;
  }

  return {
    hasHeartProblems: Boolean(data.hasHeartProblems),
    hasDiabetes: Boolean(data.hasDiabetes),
    hasHypertension: Boolean(data.hasHypertension),
    isPregnant: Boolean(data.isPregnant),
    smokingHabits: String(data.smokingHabits || ""),
    bleedingProblems: Boolean(data.bleedingProblems),
    familyHistory: String(data.familyHistory || ""),
  };
};

export function AnamneseForm({ patientId }: AnamneseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch anamnese data
  const { data: anamnese, isLoading } = useQuery({
    queryKey: [`/api/anamnese/${patientId}`],
    enabled: !!patientId,
  });

  // Memoized default values
  const defaultValues = useMemo((): AnamneseFormData => ({
    patientId,
    medicalTreatment: false,
    medications: "",
    allergies: "",
    previousDentalTreatment: false,
    painComplaint: "",
    additionalQuestions: safeNormalizeAdditionalQuestions(null),
  }), [patientId]);

  // Form setup
  const form = useForm<AnamneseFormData>({
    resolver: zodResolver(anamneseFormSchema),
    defaultValues,
  });

  // Update form when data loads
  useEffect(() => {
    if (anamnese) {
      const normalizedData: AnamneseFormData = {
        patientId: anamnese.patientId || patientId,
        medicalTreatment: Boolean(anamnese.medicalTreatment),
        medications: String(anamnese.medications || ""),
        allergies: String(anamnese.allergies || ""),
        previousDentalTreatment: Boolean(anamnese.previousDentalTreatment),
        painComplaint: String(anamnese.painComplaint || ""),
        additionalQuestions: safeNormalizeAdditionalQuestions(anamnese.additionalQuestions),
      };
      form.reset(normalizedData);
    }
  }, [anamnese, form, patientId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: AnamneseFormData) => apiRequest("POST", "/api/anamnese", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/anamnese/${patientId}`] });
      toast({
        title: "Sucesso",
        description: "Anamnese criada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar anamnese",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: AnamneseFormData) => apiRequest("PUT", `/api/anamnese/${anamnese?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/anamnese/${patientId}`] });
      toast({
        title: "Sucesso",
        description: "Anamnese atualizada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar anamnese",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AnamneseFormData) => {
    const normalizedData = {
      ...data,
      additionalQuestions: safeNormalizeAdditionalQuestions(data.additionalQuestions),
    };
    
    if (anamnese?.id) {
      updateMutation.mutate(normalizedData);
    } else {
      createMutation.mutate(normalizedData);
    }
  };

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
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safe form watchers
  const watchedValues = form.watch();
  const additionalQuestions = watchedValues.additionalQuestions || {};

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
                checked={form.watch("medicalTreatment")}
                onCheckedChange={(checked) => form.setValue("medicalTreatment", !!checked)}
              />
              <Label htmlFor="medicalTreatment">Está em tratamento médico atualmente?</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications">Medicamentos em uso</Label>
              <Textarea
                id="medications"
                {...form.register("medications")}
                placeholder="Liste os medicamentos que está tomando"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea
                id="allergies"
                {...form.register("allergies")}
                placeholder="Descreva alergias conhecidas"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="previousDentalTreatment"
                checked={form.watch("previousDentalTreatment")}
                onCheckedChange={(checked) => form.setValue("previousDentalTreatment", !!checked)}
              />
              <Label htmlFor="previousDentalTreatment">Já fez tratamento odontológico anteriormente?</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="painComplaint">Queixa de dor</Label>
              <Textarea
                id="painComplaint"
                {...form.register("painComplaint")}
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
                  checked={additionalQuestions.hasHeartProblems || false}
                  onCheckedChange={(checked) => 
                    form.setValue("additionalQuestions.hasHeartProblems", !!checked)
                  }
                />
                <Label htmlFor="hasHeartProblems">Possui problemas cardíacos?</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasDiabetes"
                  checked={additionalQuestions.hasDiabetes || false}
                  onCheckedChange={(checked) => 
                    form.setValue("additionalQuestions.hasDiabetes", !!checked)
                  }
                />
                <Label htmlFor="hasDiabetes">É diabético(a)?</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasHypertension"
                  checked={additionalQuestions.hasHypertension || false}
                  onCheckedChange={(checked) => 
                    form.setValue("additionalQuestions.hasHypertension", !!checked)
                  }
                />
                <Label htmlFor="hasHypertension">Possui hipertensão?</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPregnant"
                  checked={additionalQuestions.isPregnant || false}
                  onCheckedChange={(checked) => 
                    form.setValue("additionalQuestions.isPregnant", !!checked)
                  }
                />
                <Label htmlFor="isPregnant">Está grávida?</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bleedingProblems"
                  checked={additionalQuestions.bleedingProblems || false}
                  onCheckedChange={(checked) => 
                    form.setValue("additionalQuestions.bleedingProblems", !!checked)
                  }
                />
                <Label htmlFor="bleedingProblems">Possui problemas de coagulação?</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smokingHabits">Hábitos de fumo</Label>
              <Textarea
                id="smokingHabits"
                value={additionalQuestions.smokingHabits || ""}
                onChange={(e) => form.setValue("additionalQuestions.smokingHabits", e.target.value)}
                placeholder="Descreva hábitos de fumo"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyHistory">Histórico familiar relevante</Label>
              <Textarea
                id="familyHistory"
                value={additionalQuestions.familyHistory || ""}
                onChange={(e) => form.setValue("additionalQuestions.familyHistory", e.target.value)}
                placeholder="Descreva problemas de saúde na família"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {/* Important Alerts */}
          {(() => {
            const hasAllergies = watchedValues.allergies;
            const hasHeartProblems = additionalQuestions.hasHeartProblems;
            const hasDiabetes = additionalQuestions.hasDiabetes;
            const hasBleedingProblems = additionalQuestions.bleedingProblems;
            
            if (hasAllergies || hasHeartProblems || hasDiabetes || hasBleedingProblems) {
              return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">
                        Atenção - Informações importantes identificadas:
                      </h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {hasAllergies && <li>• Paciente possui alergias relatadas</li>}
                        {hasHeartProblems && <li>• Paciente possui problemas cardíacos</li>}
                        {hasDiabetes && <li>• Paciente é diabético</li>}
                        {hasBleedingProblems && <li>• Paciente possui problemas de coagulação</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

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
}