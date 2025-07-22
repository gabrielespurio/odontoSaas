import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ClipboardList, Save, AlertCircle } from "lucide-react";
import type { Anamnese } from "@/lib/types";
import { additionalQuestionsSchema } from "@shared/schema";

const anamneseSchema = z.object({
  patientId: z.number(),
  medicalTreatment: z.boolean(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  previousDentalTreatment: z.boolean(),
  painComplaint: z.string().optional(),
  additionalQuestions: additionalQuestionsSchema,
});

type AnamneseFormData = z.infer<typeof anamneseSchema>;

interface AnamneseFormProps {
  patientId: number;
}

export default function AnamneseForm({ patientId }: AnamneseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: anamnese, isLoading } = useQuery<Anamnese>({
    queryKey: [`/api/anamnese/${patientId}`],
    enabled: !!patientId,
  });

  // Helper function to normalize additionalQuestions from backend
  const normalizeAdditionalQuestions = (additionalQuestions: any) => {
    const defaultQuestions = {
      hasHeartProblems: false,
      hasDiabetes: false,
      hasHypertension: false,
      isPregnant: false,
      smokingHabits: "",
      bleedingProblems: false,
      familyHistory: "",
    };

    if (!additionalQuestions || typeof additionalQuestions !== 'object') {
      return defaultQuestions;
    }

    return {
      hasHeartProblems: Boolean(additionalQuestions.hasHeartProblems),
      hasDiabetes: Boolean(additionalQuestions.hasDiabetes),
      hasHypertension: Boolean(additionalQuestions.hasHypertension),
      isPregnant: Boolean(additionalQuestions.isPregnant),
      smokingHabits: String(additionalQuestions.smokingHabits || ""),
      bleedingProblems: Boolean(additionalQuestions.bleedingProblems),
      familyHistory: String(additionalQuestions.familyHistory || ""),
    };
  };

  const form = useForm<AnamneseFormData>({
    resolver: zodResolver(anamneseSchema),
    defaultValues: {
      patientId,
      medicalTreatment: false,
      medications: "",
      allergies: "",
      previousDentalTreatment: false,
      painComplaint: "",
      additionalQuestions: normalizeAdditionalQuestions(null),
    },
  });

  // Update form when anamnese data is loaded
  useEffect(() => {
    if (anamnese) {
      const normalizedQuestions = normalizeAdditionalQuestions(anamnese.additionalQuestions);
      
      form.reset({
        patientId: anamnese.patientId,
        medicalTreatment: anamnese.medicalTreatment,
        medications: anamnese.medications || "",
        allergies: anamnese.allergies || "",
        previousDentalTreatment: anamnese.previousDentalTreatment,
        painComplaint: anamnese.painComplaint || "",
        additionalQuestions: normalizedQuestions,
      });
      
      // Force form to re-render with the new values
      setTimeout(() => {
        form.trigger();
      }, 100);
    }
  }, [anamnese, form]);

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
    if (anamnese) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
                    Está em tratamento médico atualmente?
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Medicamentos em uso</Label>
                  <Textarea
                    id="medications"
                    {...form.register("medications")}
                    placeholder="Liste todos os medicamentos que está tomando atualmente"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  <Textarea
                    id="allergies"
                    {...form.register("allergies")}
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
                    Já fez tratamento odontológico antes?
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="painComplaint">Queixa de dor atual</Label>
                  <Textarea
                    id="painComplaint"
                    {...form.register("painComplaint")}
                    placeholder="Descreva qualquer dor ou desconforto atual"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Additional Health Questions */}
            <div className="space-y-4 border-t pt-4 sm:pt-6">
              <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Informações Complementares</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="hasHeartProblems"
                    checked={form.watch("additionalQuestions")?.hasHeartProblems || false}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("additionalQuestions") || {};
                      form.setValue("additionalQuestions", {
                        ...current,
                        hasHeartProblems: !!checked
                      });
                    }}
                  />
                  <Label htmlFor="hasHeartProblems" className="text-sm leading-relaxed">
                    Possui problemas cardíacos?
                  </Label>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="hasDiabetes"
                    checked={form.watch("additionalQuestions")?.hasDiabetes || false}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("additionalQuestions") || {};
                      form.setValue("additionalQuestions", {
                        ...current,
                        hasDiabetes: !!checked
                      });
                    }}
                  />
                  <Label htmlFor="hasDiabetes" className="text-sm leading-relaxed">
                    É diabético(a)?
                  </Label>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="hasHypertension"
                    checked={form.watch("additionalQuestions")?.hasHypertension || false}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("additionalQuestions") || {};
                      form.setValue("additionalQuestions", {
                        ...current,
                        hasHypertension: !!checked
                      });
                    }}
                  />
                  <Label htmlFor="hasHypertension" className="text-sm leading-relaxed">
                    Possui hipertensão?
                  </Label>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="isPregnant"
                    checked={form.watch("additionalQuestions")?.isPregnant || false}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("additionalQuestions") || {};
                      form.setValue("additionalQuestions", {
                        ...current,
                        isPregnant: !!checked
                      });
                    }}
                  />
                  <Label htmlFor="isPregnant" className="text-sm leading-relaxed">
                    Está grávida?
                  </Label>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="bleedingProblems"
                    checked={form.watch("additionalQuestions")?.bleedingProblems || false}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("additionalQuestions") || {};
                      form.setValue("additionalQuestions", {
                        ...current,
                        bleedingProblems: !!checked
                      });
                    }}
                  />
                  <Label htmlFor="bleedingProblems" className="text-sm leading-relaxed">
                    Possui problemas de coagulação?
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smokingHabits">Hábitos de fumo</Label>
                <Textarea
                  id="smokingHabits"
                  value={form.watch("additionalQuestions")?.smokingHabits || ""}
                  onChange={(e) => {
                    const current = form.getValues("additionalQuestions") || {};
                    form.setValue("additionalQuestions", {
                      ...current,
                      smokingHabits: e.target.value
                    });
                  }}
                  placeholder="Descreva hábitos de fumo (frequência, tipo, há quanto tempo)"
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyHistory">Histórico familiar relevante</Label>
                <Textarea
                  id="familyHistory"
                  value={form.watch("additionalQuestions")?.familyHistory || ""}
                  onChange={(e) => {
                    const current = form.getValues("additionalQuestions") || {};
                    form.setValue("additionalQuestions", {
                      ...current,
                      familyHistory: e.target.value
                    });
                  }}
                  placeholder="Descreva problemas de saúde relevantes na família"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Important Alerts */}
            {(() => {
              const hasAllergies = form.watch("allergies");
              const additionalQuestions = form.watch("additionalQuestions");
              const hasHeartProblems = additionalQuestions?.hasHeartProblems;
              const hasDiabetes = additionalQuestions?.hasDiabetes;
              const hasBleedingProblems = additionalQuestions?.bleedingProblems;
              
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
          </form>
        </CardContent>
      </Card>

      {/* Last Updated Info */}
      {anamnese && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-neutral-600">
              <p>
                <strong>Última atualização:</strong>{" "}
                {new Date(anamnese.updatedAt).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p>
                <strong>Criado em:</strong>{" "}
                {new Date(anamnese.createdAt).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
