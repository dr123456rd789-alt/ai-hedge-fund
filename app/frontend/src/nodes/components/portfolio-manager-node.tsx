import { type NodeProps } from '@xyflow/react';
import { Brain } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { useFlowContext } from '@/contexts/flow-context';
import { useNodeContext } from '@/contexts/node-context';
import { LanguageModel } from '@/data/models';
import { useOutputNodeConnection } from '@/hooks/use-output-node-connection';
import { cn } from '@/lib/utils';
import { type PortfolioManagerNode } from '../types';
import { getStatusColor } from '../utils';
import { InvestmentReportDialog } from './investment-report-dialog';
import { NodeShell } from './node-shell';

const FIXED_MODEL: LanguageModel = { display_name: "GPT-4.1", model_name: "gpt-4.1", provider: "OpenAI" };

export function PortfolioManagerNode({
  data,
  selected,
  id,
  isConnectable,
}: NodeProps<PortfolioManagerNode>) {
  const { currentFlowId } = useFlowContext();
  const { getAgentNodeDataForFlow, setAgentModel, getOutputNodeDataForFlow } = useNodeContext();

  const agentNodeData = getAgentNodeDataForFlow(currentFlowId?.toString() || null);
  const nodeData = agentNodeData[id] || {
    status: 'IDLE',
    ticker: null,
    message: '',
    messages: [],
    lastUpdated: 0,
  };
  const status = nodeData.status;
  const isInProgress = status === 'IN_PROGRESS';
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Set fixed model on mount
  useEffect(() => {
    const flowId = currentFlowId?.toString() || null;
    setAgentModel(flowId, id, FIXED_MODEL);
  }, [id, currentFlowId, setAgentModel]);

  const outputNodeData = getOutputNodeDataForFlow(currentFlowId?.toString() || null);
  const { connectedAgentIds } = useOutputNodeConnection(id);

  return (
    <>
      <NodeShell
        id={id}
        selected={selected}
        isConnectable={isConnectable}
        icon={<Brain className="h-5 w-5" />}
        iconColor={getStatusColor(status)}
        name={data.name || 'Portfolio Manager'}
        description={data.description}
        hasRightHandle={false}
        status={status}
      >
        <CardContent className="p-0">
          <div className="border-t border-border p-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-subtitle text-primary flex items-center gap-1">
                  Status
                </div>

                <div
                  className={cn(
                    'text-foreground text-xs rounded p-2 border border-status',
                    isInProgress ? 'gradient-animation' : getStatusColor(status)
                  )}
                >
                  <span className="capitalize">
                    {status.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <div className='flex flex-col gap-2'>
                {outputNodeData && (
                  <Button
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    View Investment Report
                  </Button>
                )}
              </div>
            </div>
          </div>
          <InvestmentReportDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            outputNodeData={outputNodeData}
            connectedAgentIds={connectedAgentIds}
          />
        </CardContent>
      </NodeShell>
    </>
  );
}
