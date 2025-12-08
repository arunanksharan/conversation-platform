/**
 * ExtractionPanel - Displays extracted medical fields from conversation
 */

import { useMemo } from 'react';
import { Card } from '../ui/components/Card';
import { Badge } from '../ui/components/Badge';
import { useExtractionStore } from '../state/extractionStore';

interface ExtractionPanelProps {
  className?: string;
  showConfidence?: boolean;
  compact?: boolean;
}

function getConfidenceBadgeVariant(
  confidence: number
): 'success' | 'warning' | 'destructive' {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.5) return 'warning';
  return 'destructive';
}

function formatFieldName(fieldName: string): string {
  // Convert camelCase or snake_case to Title Case
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return JSON.stringify(value);
}

export function ExtractionPanel({
  className = '',
  showConfidence = true,
  compact = false,
}: ExtractionPanelProps) {
  const { allExtractedFields, currentExtraction, isExtracting } =
    useExtractionStore();

  const fields = useMemo(() => {
    return Array.from(allExtractedFields.values()).sort(
      (a, b) => b.confidence - a.confidence
    );
  }, [allExtractedFields]);

  if (fields.length === 0 && !isExtracting) {
    return null;
  }

  return (
    <div className={`extraction-panel ${className}`}>
      <Card padding={compact ? 'sm' : 'default'} className="border-l-4 border-l-primary">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="text-lg">📋</span>
            Extracted Fields
            {fields.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {fields.length}
              </Badge>
            )}
          </h3>
          {isExtracting && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Extracting...
            </div>
          )}
        </div>

        {fields.length > 0 ? (
          <div className={`space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}>
            {fields.map((field) => (
              <div
                key={field.fieldName}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
              >
                <span className="text-muted-foreground font-medium">
                  {formatFieldName(field.fieldName)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {formatValue(field.value)}
                  </span>
                  {showConfidence && (
                    <Badge
                      variant={getConfidenceBadgeVariant(field.confidence)}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {Math.round(field.confidence * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Fields will appear here as they're extracted from the conversation.
          </p>
        )}

        {currentExtraction && currentExtraction.status === 'complete' && (
          <div className="mt-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Overall confidence</span>
              <Badge
                variant={getConfidenceBadgeVariant(currentExtraction.confidence)}
              >
                {Math.round(currentExtraction.confidence * 100)}%
              </Badge>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function ExtractionBadges({ className = '' }: { className?: string }) {
  const fields = useExtractionStore((state) =>
    Array.from(state.allExtractedFields.values())
  );

  if (fields.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {fields.slice(0, 5).map((field) => (
        <Badge
          key={field.fieldName}
          variant={getConfidenceBadgeVariant(field.confidence)}
          className="text-[10px]"
        >
          {formatFieldName(field.fieldName)}: {formatValue(field.value)}
        </Badge>
      ))}
      {fields.length > 5 && (
        <Badge variant="secondary" className="text-[10px]">
          +{fields.length - 5} more
        </Badge>
      )}
    </div>
  );
}
