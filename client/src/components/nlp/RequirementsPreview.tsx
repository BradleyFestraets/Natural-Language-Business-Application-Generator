import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2,
  AlertCircle,
  TrendingUp,
  Workflow,
  FileText,
  UserCheck,
  Link,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExtractedEntities {
  processes: string[];
  forms: string[];
  approvals: string[];
  integrations: string[];
}

interface QualityMetrics {
  refinementScore: number;
  completenessScore: number;
  consistencyScore: number;
}

interface RequirementsPreviewProps {
  businessRequirementId: string;
  extractedEntities: ExtractedEntities;
  workflowPatterns: string[];
  confidence: number;
  qualityMetrics?: QualityMetrics;
  suggestions?: string[];
  isEditable?: boolean;
  onSave?: (updatedRequirements: any) => void;
  onCancel?: () => void;
  onGenerateApp?: () => void;
}

interface EditableSection {
  type: 'processes' | 'forms' | 'approvals' | 'integrations' | 'workflowPatterns';
  isEditing: boolean;
  newItem: string;
}

export default function RequirementsPreview({
  businessRequirementId,
  extractedEntities,
  workflowPatterns,
  confidence,
  qualityMetrics,
  suggestions = [],
  isEditable = true,
  onSave,
  onCancel,
  onGenerateApp
}: RequirementsPreviewProps) {
  const [editedEntities, setEditedEntities] = useState<ExtractedEntities>(extractedEntities);
  const [editedPatterns, setEditedPatterns] = useState<string[]>(workflowPatterns);
  const [editingSections, setEditingSections] = useState<{ [key: string]: EditableSection }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const toggleEdit = useCallback((sectionType: EditableSection['type']) => {
    setEditingSections(prev => ({
      ...prev,
      [sectionType]: {
        type: sectionType,
        isEditing: !prev[sectionType]?.isEditing,
        newItem: ""
      }
    }));
  }, []);

  const addItem = useCallback((sectionType: EditableSection['type']) => {
    const newItem = editingSections[sectionType]?.newItem?.trim();
    if (!newItem) return;

    if (sectionType === 'workflowPatterns') {
      setEditedPatterns(prev => [...prev, newItem]);
    } else {
      setEditedEntities(prev => ({
        ...prev,
        [sectionType]: [...prev[sectionType], newItem]
      }));
    }

    setEditingSections(prev => ({
      ...prev,
      [sectionType]: {
        ...prev[sectionType],
        newItem: ""
      }
    }));

    setHasChanges(true);
  }, [editingSections]);

  const removeItem = useCallback((sectionType: EditableSection['type'], index: number) => {
    if (sectionType === 'workflowPatterns') {
      setEditedPatterns(prev => prev.filter((_, i) => i !== index));
    } else {
      setEditedEntities(prev => ({
        ...prev,
        [sectionType]: prev[sectionType].filter((_, i) => i !== index)
      }));
    }
    setHasChanges(true);
  }, []);

  const updateNewItem = useCallback((sectionType: EditableSection['type'], value: string) => {
    setEditingSections(prev => ({
      ...prev,
      [sectionType]: {
        ...prev[sectionType],
        newItem: value
      }
    }));
  }, []);

  const handleSave = useCallback(() => {
    const updatedRequirements = {
      extractedEntities: editedEntities,
      workflowPatterns: editedPatterns,
      confidence
    };

    onSave?.(updatedRequirements);
    setHasChanges(false);
    
    toast({
      title: "Requirements Updated",
      description: "Your changes have been saved successfully."
    });
  }, [editedEntities, editedPatterns, confidence, onSave, toast]);

  const handleCancel = useCallback(() => {
    setEditedEntities(extractedEntities);
    setEditedPatterns(workflowPatterns);
    setEditingSections({});
    setHasChanges(false);
    onCancel?.();
  }, [extractedEntities, workflowPatterns, onCancel]);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return "High";
    if (score >= 0.6) return "Medium";
    return "Low";
  };

  const sectionIcons = {
    processes: Workflow,
    forms: FileText,
    approvals: UserCheck,
    integrations: Link
  };

  const sectionLabels = {
    processes: "Business Processes",
    forms: "Required Forms",
    approvals: "Approval Steps",
    integrations: "System Integrations"
  };

  const renderEditableSection = (
    sectionType: EditableSection['type'],
    items: string[],
    title: string,
    icon: React.ElementType
  ) => {
    const IconComponent = icon;
    const isEditing = editingSections[sectionType]?.isEditing;
    const newItem = editingSections[sectionType]?.newItem || "";

    return (
      <Card key={sectionType}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconComponent className="h-4 w-4" />
              {title}
              <Badge variant="outline">{items.length}</Badge>
            </CardTitle>
            {isEditable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleEdit(sectionType)}
                data-testid={`button-edit-${sectionType}`}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No {title.toLowerCase()} identified
            </p>
          ) : (
            <div className="space-y-1">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{item}</span>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(sectionType, index)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isEditing && (
            <div className="flex gap-2 mt-3">
              <Input
                placeholder={`Add ${title.toLowerCase().slice(0, -1)}...`}
                value={newItem}
                onChange={(e) => updateNewItem(sectionType, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(sectionType);
                  }
                }}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={() => addItem(sectionType)}
                disabled={!newItem.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Confidence Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Requirements Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Confidence:</span>
              <Badge className={getConfidenceColor(confidence)}>
                {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Review and modify the extracted requirements before generating your application.
            {hasChanges && " You have unsaved changes."}
          </p>
        </CardContent>
      </Card>

      {/* Quality Metrics */}
      {qualityMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(qualityMetrics.refinementScore * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Refinement</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(qualityMetrics.completenessScore * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Completeness</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(qualityMetrics.consistencyScore * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Consistency</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Entities */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(sectionLabels).map(([sectionType, title]) => 
          renderEditableSection(
            sectionType as EditableSection['type'],
            editedEntities[sectionType as keyof ExtractedEntities],
            title,
            sectionIcons[sectionType as keyof typeof sectionIcons]
          )
        )}
      </div>

      {/* Workflow Patterns */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              Workflow Patterns
              <Badge variant="outline">{editedPatterns.length}</Badge>
            </CardTitle>
            {isEditable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleEdit('workflowPatterns')}
                data-testid="button-edit-workflowPatterns"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {editedPatterns.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No workflow patterns identified
            </p>
          ) : (
            <div className="space-y-1">
              {editedPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{pattern}</span>
                  {editingSections.workflowPatterns?.isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem('workflowPatterns', index)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {editingSections.workflowPatterns?.isEditing && (
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="Add workflow pattern..."
                value={editingSections.workflowPatterns?.newItem || ""}
                onChange={(e) => updateNewItem('workflowPatterns', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem('workflowPatterns');
                  }
                }}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={() => addItem('workflowPatterns')}
                disabled={!editingSections.workflowPatterns?.newItem?.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border-l-4 border-blue-500">
                  <p className="text-sm">{suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        {hasChanges && (
          <>
            <Button
              variant="outline"
              onClick={handleCancel}
              data-testid="button-cancel-changes"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel Changes
            </Button>
            <Button
              onClick={handleSave}
              data-testid="button-save-requirements"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </>
        )}
        {!hasChanges && onGenerateApp && (
          <Button
            onClick={onGenerateApp}
            data-testid="button-generate-app-preview"
          >
            Generate Application
          </Button>
        )}
      </div>
    </div>
  );
}