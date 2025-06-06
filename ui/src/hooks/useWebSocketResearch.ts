import { useRef, useEffect } from "react";
import {  ResearchStatusType, ResearchState, EnrichmentCounts, DocCounts, DocCount } from '../types';
import { checkForFinalReport } from '../utils/handlers';

interface UseWebSocketProps {
  isResearching: boolean;
  hasFinalReport: boolean;
  setIsResearching: (v: boolean) => void;
  setOutput: (v: any) => void;
  setStatus: (v: ResearchStatusType | null) => void;
  setError: (v: string | null) => void;
  setIsComplete: (v: boolean) => void;
  setCurrentPhase: (v: 'search' | 'enrichment' | 'briefing' | 'complete' | null) => void;
  setHasFinalReport: (v: boolean) => void;
  setResearchState: (fn: (prev: ResearchState) => ResearchState) => void;
  setReconnectAttempts: (fn: (prev: number) => number) => void;
  reconnectAttempts: number;
  pollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  hasScrolledToStatus: boolean;
  setHasScrolledToStatus: (v: boolean) => void;
  statusRef: React.RefObject<HTMLDivElement>;
  setIsSearchPhase: (v: boolean) => void;
  setIsQueriesExpanded: (v: boolean) => void;
  setIsEnrichmentExpanded: (v: boolean) => void;
  currentPhase: 'search' | 'enrichment' | 'briefing' | 'complete' | null;
  setShouldShowQueries: (v: boolean) => void;
  setIsBriefingExpanded: (v: boolean) => void;
  isSearchPhase: boolean;
}

export const useWebSocketResearch = (
  {
    isResearching,
    hasFinalReport,
    setIsResearching,
    setOutput,
    setStatus,
    setError,
    setIsComplete,
    setCurrentPhase,
    setHasFinalReport,
    setResearchState,
    setReconnectAttempts,
    reconnectAttempts,
    pollingIntervalRef,
    maxReconnectAttempts,
    reconnectDelay,
    hasScrolledToStatus,
    setHasScrolledToStatus,
    statusRef,
    setIsSearchPhase,
    setIsQueriesExpanded,
    setIsEnrichmentExpanded,
    currentPhase,
    setShouldShowQueries,
    setIsBriefingExpanded,
    isSearchPhase
  }: UseWebSocketProps
) => {
  const WS_URL = import.meta.env.VITE_WS_URL;
  const wsRef = useRef<WebSocket | null>(null);

  // Modify the scroll helper function
  const scrollToStatus = () => {
    if (!hasScrolledToStatus && statusRef.current) {
      const yOffset = -20; // Reduced negative offset to scroll further down
      const y = statusRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setHasScrolledToStatus(true);
    }
  };


  const connectWebSocket = (jobId: string) => {
    const wsUrl = WS_URL.startsWith('wss://') || WS_URL.startsWith('ws://')
      ? `${WS_URL}/research/ws/${jobId}`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${WS_URL}/research/ws/${jobId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setReconnectAttempts(() => 0);
    };

    ws.onclose = () => {
      if (isResearching && !hasFinalReport) {
        if (!pollingIntervalRef.current) {
          pollingIntervalRef.current = setInterval(() => checkForFinalReport(
            jobId,
            setOutput,
            setStatus,
            setIsComplete,
            setIsResearching,
            setCurrentPhase,
            setHasFinalReport,
            pollingIntervalRef
          ), 5000);
        }

        if (reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket(jobId);
          }, reconnectDelay);
        } else {
          setError("Connection lost. Checking for final report...");
        }
      } else if (isResearching) {
        setError("Research connection lost. Please try again.");
        setIsResearching(false);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
      setIsResearching(false);
    };

    ws.onmessage = (event) => {
      const rawData = JSON.parse(event.data);
      if (rawData.type === "status_update") {
        const statusData = rawData.data;
        // Handle phase transitions
        if (statusData.result?.step) {
            const step = statusData.result.step;
            if (step === "Search" && currentPhase !== 'search') {
              setCurrentPhase('search');
              setIsSearchPhase(true);
              setShouldShowQueries(true);
              setIsQueriesExpanded(true);
            } else if (step === "Enriching" && currentPhase !== 'enrichment') {
              setCurrentPhase('enrichment');
              setIsSearchPhase(false);
              setIsQueriesExpanded(false);
              setIsEnrichmentExpanded(true);
            } else if (step === "Briefing" && currentPhase !== 'briefing') {
              setCurrentPhase('briefing');
              setIsEnrichmentExpanded(false);
              setIsBriefingExpanded(true);
            }
          }
  
          // Handle completion
          if (statusData.status === "completed") {
            setCurrentPhase('complete');
            setIsComplete(true);
            setIsResearching(false);
            setStatus({
              step: "Complete",
              message: "Research completed successfully"
            });
            setOutput({
              summary: "",
              details: {
                report: statusData.result.report,
              },
            });
            setHasFinalReport(true);
            
            // Clear polling interval if it exists
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
  
          // Set search phase when first query starts generating
          if (statusData.status === "query_generating" && !isSearchPhase) {
            setIsSearchPhase(true);
            setShouldShowQueries(true);
            setIsQueriesExpanded(true);
          }
          
          // End search phase and start enrichment when moving to next step
          if (statusData.result?.step && statusData.result.step !== "Search") {
            if (isSearchPhase) {
              setIsSearchPhase(false);
              // Add delay before collapsing queries
              setTimeout(() => {
                setIsQueriesExpanded(false);
              }, 1000);
            }
            
            // Handle enrichment phase
            if (statusData.result.step === "Enriching") {
              setIsEnrichmentExpanded(true);
              // Collapse enrichment section when complete
              if (statusData.status === "enrichment_complete") {
                setTimeout(() => {
                  setIsEnrichmentExpanded(false);
                }, 1000);
              }
            }
            
            // Handle briefing phase
            if (statusData.result.step === "Briefing") {
              setIsBriefingExpanded(true);
              if (statusData.status === "briefing_complete" && statusData.result?.category) {
                // Update briefing status
                setResearchState((prev) => {
                  const newBriefingStatus = {
                    ...prev.briefingStatus,
                    [statusData.result.category]: true
                  };
                  
                  // Check if all briefings are complete
                  const allBriefingsComplete = Object.values(newBriefingStatus).every(status => status);
                  
                  // Only collapse when all briefings are complete
                  if (allBriefingsComplete) {
                    setTimeout(() => {
                      setIsBriefingExpanded(false);
                    }, 2000);
                  }
                  
                  return {
                    ...prev,
                    briefingStatus: newBriefingStatus
                  };
                });
              }
            }
          }
  
          // Handle enrichment-specific updates
          if (statusData.result?.step === "Enriching") {
            
            // Initialize enrichment counts when starting a category
            if (statusData.status === "category_start") {
              const category = statusData.result.category as keyof EnrichmentCounts;
              if (category) {
                setResearchState((prev) => ({
                  ...prev,
                  enrichmentCounts: {
                    ...prev.enrichmentCounts,
                    [category]: {
                      total: statusData.result.count || 0,
                      enriched: 0
                    }
                  } as EnrichmentCounts
                }));
              }
            }
            // Update enriched count when a document is processed
            else if (statusData.status === "extracted") {
              const category = statusData.result.category as keyof EnrichmentCounts;
              if (category) {
                setResearchState((prev) => {
                  const currentCounts = prev.enrichmentCounts?.[category];
                  if (currentCounts) {
                    return {
                      ...prev,
                      enrichmentCounts: {
                        ...prev.enrichmentCounts,
                        [category]: {
                          ...currentCounts,
                          enriched: Math.min(currentCounts.enriched + 1, currentCounts.total)
                        }
                      } as EnrichmentCounts
                    };
                  }
                  return prev;
                });
              }
            }
            // Handle extraction errors
            else if (statusData.status === "extraction_error") {
              const category = statusData.result.category as keyof EnrichmentCounts;
              if (category) {
                setResearchState((prev) => {
                  const currentCounts = prev.enrichmentCounts?.[category];
                  if (currentCounts) {
                    return {
                      ...prev,
                      enrichmentCounts: {
                        ...prev.enrichmentCounts,
                        [category]: {
                          ...currentCounts,
                          total: Math.max(0, currentCounts.total - 1)
                        }
                      } as EnrichmentCounts
                    };
                  }
                  return prev;
                });
              }
            }
            // Update final counts when a category is complete
            else if (statusData.status === "category_complete") {
              const category = statusData.result.category as keyof EnrichmentCounts;
              if (category) {
                setResearchState((prev) => ({
                  ...prev,
                  enrichmentCounts: {
                    ...prev.enrichmentCounts,
                    [category]: {
                      total: statusData.result.total || 0,
                      enriched: statusData.result.enriched || 0
                    }
                  } as EnrichmentCounts
                }));
              }
            }
          }
  
          // Handle curation-specific updates
          if (statusData.result?.step === "Curation") {
            
            // Initialize doc counts when curation starts
            if (statusData.status === "processing" && statusData.result.doc_counts) {
              setResearchState((prev) => ({
                ...prev,
                docCounts: statusData.result.doc_counts as DocCounts
              }));
            }
            // Update initial count for a category
            else if (statusData.status === "category_start") {
              const docType = statusData.result?.doc_type as keyof DocCounts;
              if (docType) {
                setResearchState((prev) => ({
                  ...prev,
                  docCounts: {
                    ...prev.docCounts,
                    [docType]: {
                      initial: statusData.result.initial_count,
                      kept: 0
                    } as DocCount
                  } as DocCounts
                }));
              }
            }
            // Increment the kept count for a specific category
            else if (statusData.status === "document_kept") {
              const docType = statusData.result?.doc_type as keyof DocCounts;
              setResearchState((prev) => {
                if (docType && prev.docCounts?.[docType]) {
                  return {
                    ...prev,
                    docCounts: {
                      ...prev.docCounts,
                      [docType]: {
                        initial: prev.docCounts[docType].initial,
                        kept: prev.docCounts[docType].kept + 1
                      }
                    } as DocCounts
                  };
                }
                return prev;
              });
            }
            // Update final doc counts when curation is complete
            else if (statusData.status === "curation_complete" && statusData.result.doc_counts) {
              setResearchState((prev) => ({
                ...prev,
                docCounts: statusData.result.doc_counts as DocCounts
              }));
            }
          }
  
          // Handle briefing status updates
          if (statusData.status === "briefing_start") {
            setStatus({
              step: "Briefing",
              message: statusData.message
            });
          } else if (statusData.status === "briefing_complete" && statusData.result?.category) {
            const category = statusData.result.category;
            setResearchState((prev) => ({
              ...prev,
              briefingStatus: {
                ...prev.briefingStatus,
                [category]: true
              }
            }));
          }
  
          // Handle query updates
          if (statusData.status === "query_generating") {
            setResearchState((prev) => {
              const key = `${statusData.result.category}-${statusData.result.query_number}`;
              return {
                ...prev,
                streamingQueries: {
                  ...prev.streamingQueries,
                  [key]: {
                    text: statusData.result.query,
                    number: statusData.result.query_number,
                    category: statusData.result.category,
                    isComplete: false
                  }
                }
              };
            });
          } else if (statusData.status === "query_generated") {
            setResearchState((prev) => {
              // Remove from streaming queries and add to completed queries
              const key = `${statusData.result.category}-${statusData.result.query_number}`;
              const { [key]: _, ...remainingStreamingQueries } = prev.streamingQueries;
              
              return {
                ...prev,
                streamingQueries: remainingStreamingQueries,
                queries: [
                  ...prev.queries,
                  {
                    text: statusData.result.query,
                    number: statusData.result.query_number,
                    category: statusData.result.category,
                  },
                ],
              };
            });
          }
          // Handle report streaming
          else if (statusData.status === "report_chunk") {
            setOutput((prev: { details: { report: any; }; }) => ({
              summary: "Generating report...",
              details: {
                report: prev?.details?.report
                  ? prev.details.report + statusData.result.chunk
                  : statusData.result.chunk,
              },
            }));
          }
          // Handle other status updates
          else if (statusData.status === "processing") {
            setIsComplete(false);
            // Only update status.step if we're not in curation or the new step is curation
            if (!statusData.result?.step || statusData.result.step !== "Curation" || statusData.result.step === "Curation") {
              setStatus({
                step: statusData.result?.step || "Processing",
                message: statusData.message || "Processing...",
              });
            }
            
            // Reset briefing status when starting a new research
            if (statusData.result?.step === "Briefing") {
              setResearchState((prev) => ({
                ...prev,
                briefingStatus: {
                  company: false,
                  industry: false,
                  financial: false,
                  news: false
                }
              }));
            }
            
            scrollToStatus();
          } else if (
            statusData.status === "failed" ||
            statusData.status === "error" ||
            statusData.status === "website_error"
          ) {
            setError(statusData.error || statusData.message || "Research failed");
            if (statusData.status === "website_error" && statusData.result?.continue_research) {
            } else {
              setIsResearching(false);
              setIsComplete(false);
            }
          }
      }
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { connectWebSocket };
};

