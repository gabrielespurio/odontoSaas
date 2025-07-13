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

const anamneseSchema = z.object({
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
  }),
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

  // Helper function to ensure additionalQuestions is always an object
  const getAdditionalQuestions = (additionalQuestions: any) => {
    if (!additionalQuestions || typeof additionalQuestions !== 'object') {
      return {
        hasHeartProblems: false,
        hasDiabetes: false,
        hasHypertension: false,
        isPregnant: false,
        smokingHabits: "",
        bleedingProblems: false,
        familyHistory: "",
      };
    }
    return {
      hasHeartProblems: additionalQuestions.hasHeartProblems || false,
      hasDiabetes: additionalQuestions.hasDiabetes || false,
      hasHypertension: additionalQuestions.hasHypertension || false,
      isPregnant: additionalQuestions.isPregnant || false,
      smokingHabits: additionalQuestions.smokingHabits || "",
      bleedingProblems: additionalQuestions.bleedingProblems || false,
      familyHistory: additionalQuestions.familyHistory || "",
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
      additionalQuestions: {
        hasHeartProblems: false,
        hasDiabetes: false,
        hasHypertension: false,
        isPregnant: false,
        smokingHabits: "",
        bleedingProblems: false,
        familyHistory: "",
      },
    },
  });

  // Update form when anamnese data is loaded
  useEffect(() => {
    if (anamnese) {
      form.reset({
        patientId: anamnese.patientId,
        medicalTreatment: anamnese.medicalTreatment,
        medications: anamnese.medications || "",
        allergies: anamnese.allergies || "",
        previousDentalTreatment: anamnese.previousDentalTreatment,
        painComplaint: anamnese.painComplaint || "",
        additionalQuestions: getAdditionalQuestions(anamnese.additionalQuestions),
      });
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="w-5 h-5 mr-2" />
            Anamnese do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Basic Health Questions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900">Histórico Médico</h3>
              
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
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-neutral-900">Informações Complementares</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasHeartProblems"
                    checked={form.watch("additionalQuestions")?.hasHeartProblems || false}
                    onCheckedChange={(checked) => 
                      form.setValue("additionalQuestions.hasHeartProblems", !!checked)
                    }
                  />
                  <Label htmlFor="hasHeartProblems" className="text-sm">
                    Possui problemas cardíacos?
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasDiabetes"
                    checked={form.watch("additionalQuestions")?.hasDiabetes || false}
                    onCheckedChange={(checked) => 
                      form.setValue("additionalQuestions.hasDiabetes", !!checked)
                    }
                  />
                  <Label htmlFor="hasDiabetes" className="text-sm">
                    É diabético(a)?
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasHypertension"
                    checked={form.watch("additionalQuestions")?.hasHypertension || false}
                    onCheckedChange={(checked) => 
                      form.setValue("additionalQuestions.hasHypertension", !!checked)
                    }
                  />
                  <Label htmlFor="hasHypertension" className="text-sm">
                    Possui hipertensão?
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPregnant"
                    checked={form.watch("additionalQuestions")?.isPregnant || false}
                    onCheckedChange={(checked) => 
                      form.setValue("additionalQuestions.isPregnant", !!checked)
                    }
                  />
                  <Label htmlFor="isPregnant" className="text-sm">
                    Está grávida?
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bleedingProblems"
                    checked={form.watch("additionalQuestions")?.bleedingProblems || false}
                    onCheckedChange={(checked) => 
                      form.setValue("additionalQuestions.bleedingProblems", !!checked)
                    }
                  />
                  <Label htmlFor="bleedingProblems" className="text-sm">
                    Possui problemas de coagulação?
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smokingHabits">Hábitos de fumo</Label>
                <Textarea
                  id="smokingHabits"
                  value={form.watch("additionalQuestions")?.smokingHabits || ""}
                  onChange={(e) => 
                    form.setValue("additionalQuestions.smokingHabits", e.target.value)
                  }
                  placeholder="Descreva hábitos de fumo (frequência, tipo, há quanto tempo)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyHistory">Histórico familiar relevante</Label>
                <Textarea
                  id="familyHistory"
                  value={form.watch("additionalQuestions")?.familyHistory || ""}
                  onChange={(e) => 
                    form.setValue("additionalQuestions.familyHistory", e.target.value)
                  }
                  placeholder="Descreva problemas de saúde relevantes na família"
                  rows={3}
                />
              </div>
            </div>

            {/* Important Alerts */}
            {(form.watch("allergies") || 
              form.watch("additionalQuestions")?.hasHeartProblems ||
              form.watch("additionalQuestions")?.hasDiabetes ||
              form.watch("additionalQuestions")?.bleedingProblems) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                      Atenção - Informações importantes identificadas:
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {form.watch("allergies") && (
                        <li>• Paciente possui alergias relatadas</li>
                      )}
                      {form.watch("additionalQuestions")?.hasHeartProblems && (
                        <li>• Paciente possui problemas cardíacos</li>
                      )}
                      {form.watch("additionalQuestions")?.hasDiabetes && (
                        <li>• Paciente é diabético</li>
                      )}
                      {form.watch("additionalQuestions")?.bleedingProblems && (
                        <li>• Paciente possui problemas de coagulação</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center"
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
