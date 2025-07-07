import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Activity, Save, X, History } from "lucide-react";
import type { DentalChart } from "@/lib/types";

const FDI_UPPER_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const FDI_UPPER_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const FDI_LOWER_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const FDI_LOWER_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

const TOOTH_CONDITIONS = [
  { value: "healthy", label: "Sadio", color: "#D4EDDA", borderColor: "#28A745", bgColor: "bg-green-100", textColor: "text-green-800" },
  { value: "carie", label: "Cárie", color: "#F8D7DA", borderColor: "#DC3545", bgColor: "bg-red-100", textColor: "text-red-800" },
  { value: "restoration", label: "Restauração", color: "#FFF3CD", borderColor: "#FFC107", bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
  { value: "extraction", label: "Extração", color: "#F8F9FA", borderColor: "#6C757D", bgColor: "bg-gray-100", textColor: "text-gray-800" },
  { value: "planned_treatment", label: "Tratamento Planejado", color: "#CCE5FF", borderColor: "#007BFF", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  { value: "completed_treatment", label: "Tratamento Realizado", color: "#D1ECF1", borderColor: "#17A2B8", bgColor: "bg-cyan-100", textColor: "text-cyan-800" },
];

// SVG tooth shapes based on real dental anatomy
const TOOTH_SHAPES = {
  // Incisors (front teeth)
  incisor: `M12 2 C16 2 20 6 20 12 L20 24 C20 28 16 32 12 32 C8 32 4 28 4 24 L4 12 C4 6 8 2 12 2 Z`,
  // Canines (pointed teeth)
  canine: `M12 2 C17 2 21 6 21 12 L21 22 C21 26 19 30 16 32 L8 32 C5 30 3 26 3 22 L3 12 C3 6 7 2 12 2 Z`,
  // Premolars (bicuspids)
  premolar: `M12 4 C18 4 22 8 22 14 L22 20 C22 26 18 30 12 30 C6 30 2 26 2 20 L2 14 C2 8 6 4 12 4 Z M8 12 L16 12 M10 16 L14 16`,
  // Molars (back teeth)
  molar: `M12 6 C19 6 24 10 24 16 L24 22 C24 28 19 32 12 32 C5 32 0 28 0 22 L0 16 C0 10 5 6 12 6 Z M6 14 L18 14 M6 18 L18 18 M8 22 L16 22`
};

interface OdontogramProps {
  patientId: number;
}

export default function Odontogram({ patientId }: OdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>("healthy");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dentalChart, isLoading } = useQuery<DentalChart[]>({
    queryKey: [`/api/dental-chart/${patientId}`],
  });

  const updateToothMutation = useMutation({
    mutationFn: (data: { toothNumber: string; condition: string; notes?: string }) =>
      apiRequest("PUT", `/api/dental-chart/${patientId}/${data.toothNumber}`, {
        condition: data.condition,
        notes: data.notes,
        treatmentDate: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dental-chart/${patientId}`] });
      toast({
        title: "Sucesso",
        description: "Condição do dente atualizada com sucesso",
      });
      setSelectedTooth(null);
      setNotes("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar condição do dente",
        variant: "destructive",
      });
    },
  });

  const getToothCondition = (toothNumber: string) => {
    const tooth = dentalChart?.find(t => t.toothNumber === toothNumber);
    return tooth?.condition || "healthy";
  };

  const getToothColor = (toothNumber: string) => {
    const condition = getToothCondition(toothNumber);
    const conditionInfo = TOOTH_CONDITIONS.find(c => c.value === condition);
    return conditionInfo?.color || "fill-gray-200 stroke-gray-400";
  };

  const handleToothClick = (toothNumber: string) => {
    setSelectedTooth(toothNumber);
    const tooth = dentalChart?.find(t => t.toothNumber === toothNumber);
    setSelectedCondition(tooth?.condition || "healthy");
    setNotes(tooth?.notes || "");
  };

  const handleUpdateTooth = () => {
    if (selectedTooth) {
      updateToothMutation.mutate({
        toothNumber: selectedTooth,
        condition: selectedCondition,
        notes: notes,
      });
    }
  };

  const getToothType = (toothNumber: string) => {
    const num = parseInt(toothNumber);
    const lastDigit = num % 10;
    
    if (lastDigit === 1 || lastDigit === 2) return 'incisor';
    if (lastDigit === 3) return 'canine';
    if (lastDigit === 4 || lastDigit === 5) return 'premolar';
    return 'molar';
  };

  const isUpperTooth = (toothNumber: string) => {
    const num = parseInt(toothNumber);
    return num >= 11 && num <= 28;
  };

  const renderToothSVG = (toothNumber: string, x: number, y: number) => {
    const isUpper = isUpperTooth(toothNumber);
    const toothType = getToothType(toothNumber);
    const isSelected = selectedTooth === toothNumber;
    const condition = getToothCondition(toothNumber);
    const conditionInfo = TOOTH_CONDITIONS.find(c => c.value === condition);
    
    const toothColor = conditionInfo?.color || "#F8F9FA";
    const borderColor = conditionInfo?.borderColor || "#6C757D";
    
    // Different SVG paths for different tooth types
    let toothPath = "";
    let toothWidth = 28;
    let toothHeight = isUpper ? 35 : 32;
    
    switch (toothType) {
      case 'incisor':
        toothPath = isUpper 
          ? "M14 2 C18 2 22 4 22 8 L22 24 C22 28 18 32 14 32 C10 32 6 28 6 24 L6 8 C6 4 10 2 14 2 Z"
          : "M14 4 C18 4 22 8 22 12 L22 24 C22 28 18 30 14 30 C10 30 6 28 6 24 L6 12 C6 8 10 4 14 4 Z";
        toothWidth = 24;
        break;
      case 'canine':
        toothPath = isUpper
          ? "M14 1 C19 1 23 4 23 9 L23 22 C23 27 20 31 16 33 L12 33 C8 31 5 27 5 22 L5 9 C5 4 9 1 14 1 Z"
          : "M14 3 C19 3 23 7 23 12 L23 22 C23 27 19 30 14 30 C9 30 5 27 5 22 L5 12 C5 7 9 3 14 3 Z";
        toothWidth = 26;
        break;
      case 'premolar':
        toothPath = isUpper
          ? "M14 3 C20 3 25 6 25 12 L25 20 C25 26 20 30 14 30 C8 30 3 26 3 20 L3 12 C3 6 8 3 14 3 Z"
          : "M14 4 C20 4 25 8 25 14 L25 22 C25 28 20 30 14 30 C8 30 3 28 3 22 L3 14 C3 8 8 4 14 4 Z";
        toothWidth = 28;
        break;
      case 'molar':
        toothPath = isUpper
          ? "M14 4 C22 4 28 7 28 13 L28 21 C28 27 22 31 14 31 C6 31 0 27 0 21 L0 13 C0 7 6 4 14 4 Z"
          : "M14 5 C22 5 28 9 28 15 L28 23 C28 29 22 31 14 31 C6 31 0 29 0 23 L0 15 C0 9 6 5 14 5 Z";
        toothWidth = 32;
        break;
    }

    return (
      <g 
        key={toothNumber} 
        onClick={() => handleToothClick(toothNumber)} 
        className="cursor-pointer tooth-svg"
        transform={`translate(${x}, ${y})`}
      >
        <defs>
          <filter id={`shadow-${toothNumber}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.1"/>
          </filter>
          {isSelected && (
            <filter id={`glow-${toothNumber}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          )}
        </defs>
        
        {/* Tooth body */}
        <path
          d={toothPath}
          fill={toothColor}
          stroke={isSelected ? "#00796B" : borderColor}
          strokeWidth={isSelected ? "3" : "2"}
          className="transition-all duration-200 hover:drop-shadow-md"
          style={{
            filter: isSelected ? `url(#glow-${toothNumber})` : `url(#shadow-${toothNumber})`
          }}
        />
        
        {/* Tooth number */}
        <text
          x={toothWidth / 2}
          y={toothHeight / 2 + 4}
          textAnchor="middle"
          className={`text-xs font-bold pointer-events-none transition-colors duration-200 ${
            isSelected ? 'fill-primary' : 'fill-neutral-700'
          }`}
        >
          {toothNumber}
        </text>
        
        {/* Selection indicator */}
        {isSelected && (
          <circle
            cx={toothWidth - 4}
            cy="4"
            r="3"
            fill="#00796B"
            className="animate-pulse"
          />
        )}
      </g>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* Main Dental Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-4 h-4 text-primary" />
            Mapa Dentário Interativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upper Jaw */}
          <div>
            <h3 className="text-base font-semibold text-neutral-800 mb-3 text-center">Arcada Superior</h3>
            <div className="flex justify-center dental-chart-container">
              <svg 
                width="100%" 
                height="120" 
                viewBox="0 0 680 120" 
                className="dental-chart-svg max-w-full border border-neutral-200 rounded-lg bg-gradient-to-b from-white to-neutral-50 shadow-inner"
              >
                {/* Upper right teeth */}
                {FDI_UPPER_RIGHT.map((tooth, index) => renderToothSVG(tooth, 20 + index * 40, 10))}
                {/* Upper left teeth */}
                {FDI_UPPER_LEFT.map((tooth, index) => renderToothSVG(tooth, 360 + index * 40, 10))}
                
                {/* Central divider line */}
                <line x1="340" y1="5" x2="340" y2="115" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />
              </svg>
            </div>
          </div>

          {/* Lower Jaw */}
          <div>
            <h3 className="text-base font-semibold text-neutral-800 mb-3 text-center">Arcada Inferior</h3>
            <div className="flex justify-center dental-chart-container">
              <svg 
                width="100%" 
                height="120" 
                viewBox="0 0 680 120" 
                className="dental-chart-svg max-w-full border border-neutral-200 rounded-lg bg-gradient-to-t from-white to-neutral-50 shadow-inner"
              >
                {/* Lower right teeth */}
                {FDI_LOWER_RIGHT.map((tooth, index) => renderToothSVG(tooth, 20 + index * 40, 15))}
                {/* Lower left teeth */}
                {FDI_LOWER_LEFT.map((tooth, index) => renderToothSVG(tooth, 360 + index * 40, 15))}
                
                {/* Central divider line */}
                <line x1="340" y1="5" x2="340" y2="115" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-neutral-50 rounded-lg p-4">
            <h4 className="font-semibold text-neutral-800 mb-3 flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Legenda das Condições
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {TOOTH_CONDITIONS.map((condition) => (
                <div key={condition.value} className="dental-legend-item flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded border-2" 
                    style={{ 
                      backgroundColor: condition.color, 
                      borderColor: condition.borderColor 
                    }}
                  ></div>
                  <span className="text-xs font-medium text-neutral-700">{condition.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tooth Editor - Below the chart */}
      {selectedTooth && (
        <Card className="tooth-editor-card shadow-sm border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {selectedTooth}
                </div>
                <div>
                  <h3 className="text-base font-semibold">Editando Dente {selectedTooth}</h3>
                  <p className="text-xs text-neutral-600">Defina a condição e adicione observações</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTooth(null)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Condition Selector */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="condition" className="text-sm font-semibold">Condição do Dente</Label>
                  <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione a condição" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOOTH_CONDITIONS.map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded border-2" 
                              style={{ 
                                backgroundColor: condition.color, 
                                borderColor: condition.borderColor 
                              }}
                            ></div>
                            {condition.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateTooth}
                    disabled={updateToothMutation.isPending}
                    className="flex-1"
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateToothMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTooth(null)}
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>

              {/* Notes and History */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="notes" className="text-sm font-semibold">Observações Clínicas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 min-h-[80px]"
                    placeholder="Descreva detalhes sobre o tratamento..."
                  />
                </div>

                {/* Tooth History */}
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico do Dente
                  </Label>
                  <div className="mt-2 space-y-2 max-h-24 overflow-y-auto">
                    {dentalChart
                      ?.filter(tooth => tooth.toothNumber === selectedTooth)
                      .map((tooth) => (
                        <div key={tooth.id} className="p-2 bg-white rounded-md border border-neutral-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {TOOTH_CONDITIONS.find(c => c.value === tooth.condition)?.label}
                            </Badge>
                            <span className="text-xs text-neutral-500">
                              {tooth.treatmentDate ? new Date(tooth.treatmentDate).toLocaleDateString('pt-BR') : 'Data não informada'}
                            </span>
                          </div>
                          {tooth.notes && (
                            <p className="text-xs text-neutral-700 mt-1">{tooth.notes}</p>
                          )}
                        </div>
                      ))}
                    {(!dentalChart || dentalChart.filter(tooth => tooth.toothNumber === selectedTooth).length === 0) && (
                      <p className="text-xs text-neutral-500 italic p-2 bg-white rounded-md border border-neutral-200">
                        Nenhum histórico encontrado para este dente
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!selectedTooth && (
        <Card className="border-dashed border-neutral-300 bg-neutral-50/50">
          <CardContent className="text-center py-6">
            <Activity className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-neutral-700 mb-2">Selecione um Dente</h3>
            <p className="text-sm text-neutral-600">
              Clique em qualquer dente no mapa dentário acima para visualizar e editar suas informações clínicas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
