
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchRules, 
  createRule, 
  updateRule, 
  deleteRule, 
  recordRuleViolation,
  getRuleViolations,
  uploadRuleImage
} from '@/services/rules';
import { Rule, CreateRuleInput, UpdateRuleInput, RuleViolation } from '@/types/rule.types';
import { toast } from '@/hooks/use-toast';

export const RULES_QUERY_KEY = 'rules';
export const RULE_VIOLATIONS_QUERY_KEY = 'rule-violations';

export const useRulesData = () => {
  const queryClient = useQueryClient();

  // Query for fetching all rules
  const { 
    data: rules = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: [RULES_QUERY_KEY],
    queryFn: fetchRules,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating a rule
  const createRuleMutation = useMutation({
    mutationFn: (newRule: CreateRuleInput) => createRule(newRule),
    onSuccess: (newRule) => {
      queryClient.setQueryData(
        [RULES_QUERY_KEY],
        (oldData: Rule[] = []) => [newRule, ...oldData]
      );
      
      toast({
        title: "Rule created",
        description: "Your rule has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a rule
  const updateRuleMutation = useMutation({
    mutationFn: (updatedRule: UpdateRuleInput) => updateRule(updatedRule),
    onMutate: async (updatedRule) => {
      await queryClient.cancelQueries({ queryKey: [RULES_QUERY_KEY] });
      
      const previousRules = queryClient.getQueryData<Rule[]>([RULES_QUERY_KEY]);
      
      if (previousRules) {
        queryClient.setQueryData(
          [RULES_QUERY_KEY],
          previousRules.map(rule => 
            rule.id === updatedRule.id ? { ...rule, ...updatedRule } : rule
          )
        );
      }
      
      return { previousRules };
    },
    onSuccess: () => {
      toast({
        title: "Rule updated",
        description: "Your rule has been updated successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData([RULES_QUERY_KEY], context.previousRules);
      }
      
      toast({
        title: "Failed to update rule",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RULES_QUERY_KEY] });
    },
  });

  // Mutation for deleting a rule
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteRule(ruleId),
    onMutate: async (ruleId) => {
      await queryClient.cancelQueries({ queryKey: [RULES_QUERY_KEY] });
      
      const previousRules = queryClient.getQueryData<Rule[]>([RULES_QUERY_KEY]);
      
      if (previousRules) {
        queryClient.setQueryData(
          [RULES_QUERY_KEY],
          previousRules.filter(rule => rule.id !== ruleId)
        );
      }
      
      return { previousRules };
    },
    onSuccess: () => {
      toast({
        title: "Rule deleted",
        description: "Your rule has been deleted successfully.",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData([RULES_QUERY_KEY], context.previousRules);
      }
      
      toast({
        title: "Failed to delete rule",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RULES_QUERY_KEY] });
    },
  });

  // Mutation for recording a rule violation
  const recordViolationMutation = useMutation({
    mutationFn: (ruleId: string) => recordRuleViolation(ruleId),
    onSuccess: (_, ruleId) => {
      const violatedRule = rules.find(r => r.id === ruleId);
      
      toast({
        title: "Rule violation recorded",
        description: violatedRule 
          ? `"${violatedRule.title}" violation has been recorded.` 
          : "The rule violation has been recorded.",
        variant: "destructive",
      });
      
      queryClient.invalidateQueries({ queryKey: [RULE_VIOLATIONS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record violation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Query for fetching rule violations
  const useRuleViolations = (startDate: Date, endDate: Date) => {
    return useQuery({
      queryKey: [RULE_VIOLATIONS_QUERY_KEY, startDate.toISOString(), endDate.toISOString()],
      queryFn: () => getRuleViolations(startDate, endDate),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Mutation for uploading a rule image
  const uploadImageMutation = useMutation({
    mutationFn: ({ file, ruleId }: { file: File; ruleId: string }) => 
      uploadRuleImage(file, ruleId),
    onSuccess: (imageUrl, { ruleId }) => {
      // Update the rule with the new image URL
      updateRuleMutation.mutate({ 
        id: ruleId, 
        image_url: imageUrl 
      });
      
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    rules,
    isLoading,
    error,
    createRule: createRuleMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
    recordRuleViolation: recordViolationMutation.mutate,
    uploadRuleImage: uploadImageMutation.mutate,
    useRuleViolations,
  };
};
