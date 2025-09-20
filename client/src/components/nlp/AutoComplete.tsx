import { useState, useEffect, useCallback, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AutoCompleteProps {
  value: string;
  onSelect: (suggestion: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
  minLength?: number;
  debounceMs?: number;
}

export default function AutoComplete({
  value,
  onSelect,
  isOpen,
  onOpenChange,
  triggerRef,
  minLength = 20,
  debounceMs = 300
}: AutoCompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Mutation for fetching suggestions
  const suggestionsMutation = useMutation({
    mutationFn: (partialDescription: string) =>
      apiRequest('/api/nlp/auto-complete', {
        method: 'POST',
        body: JSON.stringify({ partialDescription }),
      }),
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
      setIsLoading(false);
    },
    onError: () => {
      setSuggestions([]);
      setIsLoading(false);
    }
  });

  // Debounced fetch suggestions
  const fetchSuggestions = useCallback((text: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.length < minLength) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      suggestionsMutation.mutate(text);
    }, debounceMs);
  }, [minLength, debounceMs, suggestionsMutation]);

  // Fetch suggestions when value changes
  useEffect(() => {
    fetchSuggestions(value);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, fetchSuggestions]);

  // Common business scenario templates
  const commonTemplates = [
    {
      category: "HR & Employee Management",
      templates: [
        "Employee onboarding with document collection and approval workflows",
        "Performance review system with multi-level evaluations",
        "Leave management with automatic approval routing"
      ]
    },
    {
      category: "Finance & Expenses",
      templates: [
        "Expense reporting with receipt upload and manager approval",
        "Invoice processing with automated payment workflows",
        "Budget approval system with multi-tier authorization"
      ]
    },
    {
      category: "Operations & Projects",
      templates: [
        "Project tracking with milestone management and reporting",
        "Inventory management with automated reorder points",
        "Service request system with SLA tracking"
      ]
    }
  ];

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    onOpenChange(false);
  };

  if (!isOpen) return null;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div ref={triggerRef as any} />
      </PopoverTrigger>
      <PopoverContent 
        className="w-[600px] p-0" 
        align="start"
        side="bottom"
        sideOffset={5}
      >
        <Command>
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Suggestions</span>
              {isLoading && (
                <div className="ml-auto animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
              )}
            </div>
          </div>

          <CommandList className="max-h-[400px] overflow-y-auto">
            {suggestions.length > 0 && (
              <CommandGroup heading="Suggested Completions">
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => handleSelect(suggestion)}
                    className="cursor-pointer p-3"
                    data-testid={`suggestion-${index}`}
                  >
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isLoading && suggestions.length === 0 && value.length >= minLength && (
              <CommandEmpty>
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Keep typing to get AI suggestions...
                </div>
              </CommandEmpty>
            )}

            {value.length < minLength && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Quick start with common business scenarios:
                </p>
                {commonTemplates.map((category, catIndex) => (
                  <div key={catIndex} className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      {category.category}
                    </div>
                    <div className="space-y-1">
                      {category.templates.map((template, tplIndex) => (
                        <CommandItem
                          key={`${catIndex}-${tplIndex}`}
                          onSelect={() => handleSelect(template)}
                          className="cursor-pointer p-2"
                          data-testid={`template-${catIndex}-${tplIndex}`}
                        >
                          <span className="text-sm">{template}</span>
                        </CommandItem>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CommandList>

          {suggestions.length > 0 && (
            <div className="p-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Press Enter to select • Esc to close</span>
                <Badge variant="secondary" className="text-xs">
                  {suggestions.length} suggestions
                </Badge>
              </div>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}