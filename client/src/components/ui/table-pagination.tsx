import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  canGoPrevious,
  canGoNext,
  startIndex,
  endIndex,
  totalItems,
}: TablePaginationProps) {
  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7; // Aumentamos para mostrar mais páginas
    
    if (totalPages <= maxVisiblePages) {
      // Se houver poucas páginas, mostra todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sempre mostrar primeira página
      pages.push(1);
      
      const halfVisible = Math.floor((maxVisiblePages - 3) / 2); // -3 para primeira, última e elipses
      let startPage = Math.max(2, currentPage - halfVisible);
      let endPage = Math.min(totalPages - 1, currentPage + halfVisible);
      
      // Ajustar range para sempre mostrar o número adequado
      if (currentPage <= halfVisible + 2) {
        endPage = Math.min(totalPages - 1, maxVisiblePages - 2);
      }
      if (currentPage >= totalPages - halfVisible - 1) {
        startPage = Math.max(2, totalPages - maxVisiblePages + 2);
      }
      
      // Adicionar elipse se necessário antes do range
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Adicionar páginas do range
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Adicionar elipse se necessário depois do range
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Sempre mostrar última página
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-center px-4 py-3 bg-white border-t border-gray-200">
        <div className="text-sm text-gray-700 font-medium">
          {totalItems === 0 ? 'Nenhum resultado encontrado' : `${totalItems} ${totalItems === 1 ? 'resultado' : 'resultados'}`}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      {/* Versão Mobile */}
      <div className="flex justify-between items-center sm:hidden">
        <div className="text-sm text-gray-700">
          Página {currentPage} de {totalPages}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="px-3 py-1 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="px-3 py-1 text-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Versão Desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="text-sm text-gray-700">
          Mostrando <span className="font-medium">{startIndex}</span> a <span className="font-medium">{endIndex}</span> de{' '}
          <span className="font-medium">{totalItems}</span> resultados
        </div>

        <div className="flex items-center space-x-1">
          {/* Botão Primeira Página */}
          {currentPage > 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
              title="Primeira página"
            >
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-1" />
            </Button>
          )}

          {/* Botão Anterior */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="px-3 py-1 text-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          {/* Números das Páginas */}
          <div className="flex items-center space-x-1">
            {generatePageNumbers().map((pageNumber, index) => (
              <div key={index}>
                {pageNumber === '...' ? (
                  <span className="px-3 py-1 text-gray-500">...</span>
                ) : (
                  <Button
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNumber as number)}
                    className={`px-3 py-1 text-sm min-w-[2.5rem] ${
                      pageNumber === currentPage 
                        ? 'bg-primary text-white hover:bg-primary/90' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNumber}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Botão Próximo */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="px-3 py-1 text-sm"
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          {/* Botão Última Página */}
          {currentPage < totalPages - 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
              title="Última página"
            >
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="mt-2 text-xs text-gray-500 text-center sm:text-left">
        Use as setas do teclado ← → para navegar entre páginas
      </div>
    </div>
  );
}