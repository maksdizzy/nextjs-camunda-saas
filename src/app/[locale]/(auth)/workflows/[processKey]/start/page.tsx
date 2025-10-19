'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicForm } from '@/components/workflows/DynamicForm';
import { useProcess, useStartFormVariables } from '@/hooks/useProcesses';
import { formDataToVariables, useWorkflowApi } from '@/lib/api/workflows';
import type { FormField } from '@/types/workflow';

export default function StartProcessPage({
  params,
}: {
  params: { locale: string; processKey: string };
}) {
  const router = useRouter();
  const api = useWorkflowApi();
  const queryClient = useQueryClient();

  const { data: process, isLoading: processLoading } = useProcess(
    params.processKey,
  );
  const { data: formVariables, isLoading: variablesLoading } = useStartFormVariables(params.processKey);

  const [businessKey, setBusinessKey] = useState('');

  const startProcessMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      const variables = formDataToVariables(formData);
      return api.startProcess(params.processKey, {
        variables,
        businessKey: businessKey || undefined,
      });
    },
    onSuccess: (instance) => {
      queryClient.invalidateQueries({ queryKey: ['process-instances'] });
      router.push(`/${params.locale}/workflows/instances/${instance.id}`);
    },
  });

  if (processLoading || variablesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!process) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
        <h3 className="text-lg font-semibold text-destructive">
          Process Not Found
        </h3>
        <p className="mt-2 text-sm text-destructive">
          The requested process definition could not be found.
        </p>
      </div>
    );
  }

  const fields: FormField[] = formVariables
    ? Object.entries(formVariables).map(([key, variable]) => ({
      id: key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      type: variable.type.toLowerCase() as any,
      defaultValue: variable.value,
    }))
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          Back
        </Button>
        <h1 className="text-3xl font-bold">Start Process</h1>
        <p className="mt-2 text-muted-foreground">{process.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Process Details</CardTitle>
          <CardDescription>
            Configure the initial variables for this process instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="businessKey"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Business Key (Optional)
            </label>
            <input
              id="businessKey"
              type="text"
              value={businessKey}
              onChange={e => setBusinessKey(e.target.value)}
              placeholder="Enter a business key to identify this instance"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-sm text-muted-foreground">
              A unique identifier for business correlation
            </p>
          </div>

          {fields.length > 0
            ? (
                <DynamicForm
                  fields={fields}
                  onSubmit={(formData) => {
                    startProcessMutation.mutate(formData);
                  }}
                  submitLabel="Start Process"
                  isLoading={startProcessMutation.isPending}
                />
              )
            : (
                <div className="flex justify-end">
                  <Button
                    onClick={() => startProcessMutation.mutate({})}
                    disabled={startProcessMutation.isPending}
                  >
                    {startProcessMutation.isPending
                      ? 'Starting...'
                      : 'Start Process'}
                  </Button>
                </div>
              )}

          {startProcessMutation.isError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                {startProcessMutation.error instanceof Error
                  ? startProcessMutation.error.message
                  : 'Failed to start process'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
