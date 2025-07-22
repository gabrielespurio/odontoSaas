import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ClipboardList, Save, AlertCircle } from "lucide-react";
import { z } from "zod";
import type { Anamnese } from "@shared/schema";

// Schema simplificado para o formulário
const anamneseFormSchema = z.object({
  patientId: z.number(),
  medicalTreatment: z.boolean(),
  medications: z.string(),
  allergies: z.string(),
  previousDentalTreatment: z.boolean(),
  painComplaint: z.string(),
  // Campos individuais em vez de objeto aninhado
  hasHeartProblems: z.boolean(),
  hasDiabetes: z.boolean(),
  hasHypertension: z.boolean(),
  isPregnant: z.boolean(),
  smokingHabits: z.string(),
  bleedingProblems: z.boolean(),
  familyHistory: z.string(),
});

type AnamneseFormData = z.infer<typeof anamneseFormSchema>;

interface AnamneseFormProps {
  patientId: number;
}

export default function AnamneseFormWorking({ patientId }: AnamneseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formReady, setFormReady] = useState(false);

  const { data: anamnese, isLoading } = useQuery<Anamnese>({
    queryKey: [`/api/anamnese/${patientId}`],
    enabled: !!patientId,
  });

  const form = useForm<AnamneseFormData>({
    resolver: zodResolver(anamneseFormSchema),
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

  // Carregar dados quando anamnese for recebida
  useEffect(() => {
    if (anamnese && !formReady) {
      console.log("Loading anamnese data:", anamnese);
      
      const additionalQuestions = anamnese.additionalQuestions || {};
      
      // Definir valores individualmente para garantir que funcionem
      const formData: AnamneseFormData = {
        patientId: anamnese.patientId,
        medicalTreatment: anamnese.medicalTreatment,
        medications: anamnese.medications || "",
        allergies: anamnese.allergies || "",
        previousDentalTreatment: anamnese.previousDentalTreatment,
        painComplaint: anamnese.painComplaint || "",
        hasHeartProblems: Boolean(additionalQuestions.hasHeartProblems),
        hasDiabetes: Boolean(additionalQuestions.hasDiabetes),
        hasHypertension: Boolean(additionalQuestions.hasHypertension),
        isPregnant: Boolean(additionalQuestions.isPregnant),
        smokingHabits: String(additionalQuestions.smokingHabits || ""),
        bleedingProblems: Boolean(additionalQuestions.bleedingProblems),
        familyHistory: String(additionalQuestions.familyHistory || ""),
      };
      
      console.log("Setting form data:", formData);
      
      // Resetar o formulário com os novos dados
      form.reset(formData);
      setFormReady(true);
    } else if (!anamnese && !isLoading) {
      // Se não há anamnese, marcar como pronto
      setFormReady(true);
    }
  }, [anamnese, form, formReady, isLoading]);

  const createMutation = useMutation({
    mutationFn: (data: AnamneseFormData) => {
      // Converter de volta para o formato esperado pelo backend
      const backendData = {
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
      return apiRequest("POST", "/api/anamnese", backendData);
    },
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
    mutationFn: (data: AnamneseFormData) => {
      // Converter de volta para o formato esperado pelo backend
      const backendData = {
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
      return apiRequest("PUT", `/api/anamnese/${anamnese?.id}`, backendData);
    },
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
    console.log("Submitting form data:", data);
    if (anamnese) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Carregando anamnese...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formValues = form.watch();

  return (
    <div className="space-y-4 sm:space-y-6 p-1">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Anamnese do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Basic Health Questions */}
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Histórico Médico</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="medicalTreatment"
                    checked={form.watch("medicalTreatment")}
                    onCheckedChange={(checked) => form.setValue("medicalTreatment", !!checked)}
                  />
                  <Label htmlFor="medicalTreatment" className="text-sm font-medium">
                    Está fazendo algum tratamento médico?
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Tem alguma alergia conhecida?</Label>
                  <Textarea
                    id="allergies"
                    value={form.watch("allergies")}
                    onChange={(e) => form.setValue("allergies", e.target.value)}
                    placeholder="Descreva qualquer alergia medicamentosa ou a outros materiais"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="previousDentalTreatment"
                    checked={form.watch("previousDentalTreatment")}
                    onCheckedChange={(checked) => form.setValue("previousDentalTreatment", !!checked)}
                  />
                  <Label htmlFor="previousDentalTreatment" className="text-sm font-medium">
                    Já fez tratamento odontológico anterior?
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="painComplaint">Queixa de dor atual</Label>
                  <Textarea
                    id="painComplaint"
                    value={form.watch("painComplaint")}
                    onChange={(e) => form.setValue("painComplaint", e.target.value)}
                    placeholder="Descreva qualquer dor ou desconforto atual"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Additional Health Questions */}
            <div className="space-y-4 border-t pt-4 sm:pt-6">
              <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Condições de Saúde</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="hasHeartProblems"
                    checked={form.watch("hasHeartProblems")}
                    onCheckedChange={(checked) => form.setValue("hasHeartProblems", !!checked)}
                  />
                  <Label htmlFor="hasHeartProblems" className="text-sm leading-relaxed">
                    Problemas cardíacos
                  </Label>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="hasDiabetes"
                    checked={form.watch("hasDiabetes")}
                    onCheckedChange={(checked) => form.setValue("hasDiabetes", !!checked)}
                  />
                  <Label htmlFor="hasDiabetes" className="text-sm leading-relaxed">
                    Diabetes
                  </Label>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="hasHypertension"
                    checked={form.watch("hasHypertension")}
                    onCheckedChange={(checked) => form.setValue("hasHypertension", !!checked)}
                  />
                  <Label htmlFor="hasHypertension" className="text-sm leading-relaxed">
                    Hipertensão
                  </Label>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="isPregnant"
                    checked={form.watch("isPregnant")}
                    onCheckedChange={(checked) => form.setValue("isPregnant", !!checked)}
                  />
                  <Label htmlFor="isPregnant" className="text-sm leading-relaxed">
                    Gestante
                  </Label>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="bleedingProblems"
                    checked={form.watch("bleedingProblems")}
                    onCheckedChange={(checked) => form.setValue("bleedingProblems", !!checked)}
                  />
                  <Label htmlFor="bleedingProblems" className="text-sm leading-relaxed">
                    Problemas de coagulação
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smokingHabits">Hábitos de fumo</Label>
                <Textarea
                  id="smokingHabits"
                  value={form.watch("smokingHabits")}
                  onChange={(e) => form.setValue("smokingHabits", e.target.value)}
                  placeholder="Descreva os hábitos de fumo..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyHistory">Histórico familiar</Label>
                <Textarea
                  id="familyHistory"
                  value={form.watch("familyHistory")}
                  onChange={(e) => form.setValue("familyHistory", e.target.value)}
                  placeholder="Descreva o histórico familiar relevante..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Important Alerts */}
            {(() => {
              const hasAllergies = formValues.allergies;
              const hasHeartProblems = formValues.hasHeartProblems;
              const hasDiabetes = formValues.hasDiabetes;
              const hasBleedingProblems = formValues.bleedingProblems;
              
              if (hasAllergies || hasHeartProblems || hasDiabetes || hasBleedingProblems) {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-medium text-yellow-800 mb-2">
                          Atenção - Informações importantes identificadas:
                        </h4>
                        <ul className="text-xs sm:text-sm text-yellow-700 space-y-1">
                          {hasAllergies && (
                            <li>• Paciente possui alergias relatadas</li>
                          )}
                          {hasHeartProblems && (
                            <li>• Paciente possui problemas cardíacos</li>
                          )}
                          {hasDiabetes && (
                            <li>• Paciente é diabético</li>
                          )}
                          {hasBleedingProblems && (
                            <li>• Paciente possui problemas de coagulação</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending 
                  ? "Salvando..." 
                  : anamnese ? "Atualizar Anamnese" : "Salvar Anamnese"
                }
              </Button>
            </div>

            {/* Success Message */}
            <div className="text-xs text-green-600 mt-4 bg-green-50 p-2 rounded">
              <p>Sucesso</p>
              <p>Anamnese salva com sucesso.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}