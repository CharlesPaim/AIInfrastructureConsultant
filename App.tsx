import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { startChat } from './services/geminiService';
import type { Chat } from '@google/genai';
import {
  MAIN_ENV_OPTIONS,
  CLOUD_PROVIDERS_OPTIONS,
  VIRTUALIZATION_OPTIONS,
  IAC_OPTIONS,
  CICD_OPTIONS,
  MONITORING_OPTIONS,
  NETWORKING_SECURITY_OPTIONS
} from './constants';

// --- TYPE DEFINITIONS ---
interface FormData {
  mainEnvironment: string;
  cloudProviders: string[];
  virtualization: string[];
  iac: string[];
  cicd: string[];
  monitoring: string[];
  networking: string[];
  scenario: string;
}

interface FormErrors {
    mainEnvironment?: string;
    scenario?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- SVG ICONS ---
const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 0 1-2.25 2.25h-1.5a2.25 2.25 0 0 1-2.25-2.25V3.888c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const PaperAirplaneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
);

// --- MODEL MESSAGE COMPONENT ---
const ModelMessage: React.FC<{ text: string }> = React.memo(({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  const formattedResponse = useMemo(() => {
    if (!text) return [];
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```[a-z]*\n?/, '').replace(/```/, '');
        return (
          <div key={index} className="bg-base-dark-200 dark:bg-black/40 rounded-md my-4 relative">
            <pre className="p-4 text-sm text-base-dark-content dark:text-gray-200 overflow-x-auto">
              <code>{code.trim()}</code>
            </pre>
          </div>
        );
      }
      return <p key={index} className="whitespace-pre-wrap">{part}</p>;
    });
  }, [text]);

  return (
    <div className="relative group">
        <button 
          onClick={handleCopy} 
          className="absolute top-2 right-2 p-1.5 rounded-md bg-base-300/50 dark:bg-base-dark-300/50 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          aria-label={copied ? 'Copiado!' : 'Copiar para a área de transferência'}
          title={copied ? 'Copiado!' : 'Copiar para a área de transferência'}
        >
          {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
        </button>
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-h3:text-lg prose-p:text-base-content dark:prose-p:text-base-dark-content">
            {formattedResponse}
        </div>
    </div>
  );
});


// --- CHAT WINDOW COMPONENT ---
interface ChatWindowProps {
  chatHistory: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}
const ChatWindow: React.FC<ChatWindowProps> = ({ chatHistory, isLoading, onSendMessage }) => {
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isLoading) {
      onSendMessage(chatInput);
      setChatInput('');
    }
  };

  return (
    <div className="bg-base-100 dark:bg-base-dark-100 rounded-2xl shadow-lg h-full flex flex-col relative">
      <div className="p-6 border-b border-base-300 dark:border-base-dark-300">
        <h2 className="text-xl font-bold">Análise e Recomendação</h2>
      </div>
      <div className="p-4 overflow-y-auto flex-grow flex flex-col space-y-4">
        {chatHistory.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-base-300 dark:text-base-dark-300">
            <SparklesIcon className="w-20 h-20 mb-4" />
            <p className="text-lg">Sua solução customizada aparecerá aqui.</p>
          </div>
        )}
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-brand-primary text-white' : 'bg-base-200 dark:bg-base-dark-200'}`}>
              {msg.role === 'model' ? <ModelMessage text={msg.text} /> : <p className="whitespace-pre-wrap text-sm">{msg.text}</p>}
            </div>
          </div>
        ))}
        {isLoading && chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg animate-pulse-fast">Analisando seu cenário...</p>
          </div>
        )}
        {isLoading && chatHistory.length > 0 && (
          <div className="flex justify-start">
             <div className="max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm bg-base-200 dark:bg-base-dark-200 flex items-center gap-2">
                 <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                 <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                 <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {chatHistory.length > 0 && (
        <div className="p-4 border-t border-base-300 dark:border-base-dark-300">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleFormSubmit(e);
                  }
              }}
              placeholder="Faça uma pergunta de acompanhamento..."
              rows={1}
              className="w-full p-2 text-sm bg-base-200 dark:bg-base-dark-200 border rounded-lg focus:ring-2 transition flex-grow resize-none border-base-300 dark:border-base-dark-300 focus:ring-brand-primary focus:border-brand-primary"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !chatInput.trim()} className="p-2 rounded-lg bg-brand-primary text-white transition-colors hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:bg-gray-400 disabled:cursor-not-allowed">
                <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};


// --- FORM COMPONENTS ---
interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}
const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-base-200 dark:hover:bg-base-dark-300 transition-colors">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="form-checkbox h-4 w-4 text-brand-primary bg-base-100 dark:bg-base-dark-100 border-base-300 dark:border-base-dark-300 rounded focus:ring-brand-primary focus:ring-offset-0" />
        <span className="text-sm">{label}</span>
    </label>
);

interface RadioProps {
    label: string;
    name: string;
    value: string;
    checked: boolean;
    onChange: (value: string) => void;
}
const Radio: React.FC<RadioProps> = ({ label, name, value, checked, onChange}) => (
    <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-base-200 dark:hover:bg-base-dark-300 transition-colors">
        <input type="radio" name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.value)} className="form-radio h-4 w-4 text-brand-primary bg-base-100 dark:bg-base-dark-100 border-base-300 dark:border-base-dark-300 focus:ring-brand-primary focus:ring-offset-0" />
        <span className="text-sm">{label}</span>
    </label>
);

interface SelectionGroupProps {
  title: string;
  options: string[];
  selected: string | string[];
  onChange: (value: string) => void;
  type: 'checkbox' | 'radio';
  name?: string;
  hasError?: boolean;
}

const SelectionGroup: React.FC<SelectionGroupProps> = ({ title, options, selected, onChange, type, name, hasError }) => (
  <div className="space-y-2">
    <h3 className={`font-semibold text-md mb-2 ${hasError ? 'text-red-500' : ''}`}>{title}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {options.map((option) =>
        type === 'checkbox' ? (
          <Checkbox key={option} label={option} checked={(selected as string[]).includes(option)} onChange={() => onChange(option)} />
        ) : (
          <Radio key={option} label={option} name={name!} value={option} checked={selected === option} onChange={onChange}/>
        )
      )}
    </div>
  </div>
);

// --- WIZARD STEPPER COMPONENT ---
interface WizardStepperProps {
    currentStep: number;
    onStepClick: (step: number) => void;
}
const WizardStepper: React.FC<WizardStepperProps> = ({ currentStep, onStepClick }) => {
    const steps = ["Ambiente", "Tecnologias", "Cenário", "Gerar"];
    return (
        <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = currentStep > stepNumber;
                const isCurrent = currentStep === stepNumber;

                return (
                    <React.Fragment key={step}>
                        <div
                            className={`flex items-center flex-col cursor-pointer`}
                            onClick={() => isCompleted && onStepClick(stepNumber)}
                            role="button"
                            tabIndex={isCompleted ? 0 : -1}
                            aria-label={`Ir para a etapa ${stepNumber}: ${step}`}
                        >
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${
                                    isCurrent ? 'bg-brand-primary text-white' : 
                                    isCompleted ? 'bg-brand-dark text-white' : 'bg-base-300 dark:bg-base-dark-300 text-base-content/50 dark:text-base-dark-content/50'
                                }`}
                            >
                                {isCompleted ? <CheckIcon className="w-5 h-5"/> : stepNumber}
                            </div>
                            <p className={`mt-2 text-xs font-semibold ${isCurrent || isCompleted ? 'text-brand-primary dark:text-brand-secondary' : 'text-gray-500'}`}>{step}</p>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 rounded ${currentStep > stepNumber ? 'bg-brand-primary' : 'bg-base-300 dark:bg-base-dark-300'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};


// --- MAIN APP COMPONENT ---
function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    mainEnvironment: '',
    cloudProviders: [],
    virtualization: [],
    iac: [],
    cicd: [],
    monitoring: [],
    networking: [],
    scenario: ''
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});


  const handleSelectionChange = useCallback((category: keyof FormData, value: string) => {
    setFormData(prev => {
      const currentSelection = prev[category];
      if (Array.isArray(currentSelection)) {
        const newSelection = currentSelection.includes(value)
          ? currentSelection.filter(item => item !== value)
          : [...currentSelection, value];
        return { ...prev, [category]: newSelection };
      } else {
        // This is for radio buttons
        return { ...prev, [category]: value };
      }
    });

    if (category === 'mainEnvironment') {
        setFormErrors(prev => ({ ...prev, mainEnvironment: undefined }));
    }
  }, []);
  
  const handleScenarioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, scenario: value }));
    if (value.trim() !== '') {
        setFormErrors(prev => ({ ...prev, scenario: undefined }));
    }
  };

  const buildPrompt = () => {
      let context = `
---
CONTEXTO TÉCNICO DO USUÁRIO:
- Ambiente Principal: ${formData.mainEnvironment || 'Não especificado'}
`;
      if (formData.cloudProviders.length > 0) context += `- Provedores de Cloud: ${formData.cloudProviders.join(', ')}\n`;
      if (formData.virtualization.length > 0) context += `- Virtualização e Contêineres: ${formData.virtualization.join(', ')}\n`;
      if (formData.iac.length > 0) context += `- IaC e Gerenciamento de Configuração: ${formData.iac.join(', ')}\n`;
      if (formData.cicd.length > 0) context += `- CI/CD: ${formData.cicd.join(', ')}\n`;
      if (formData.monitoring.length > 0) context += `- Monitoramento e Observabilidade: ${formData.monitoring.join(', ')}\n`;
      if (formData.networking.length > 0) context += `- Redes e Segurança: ${formData.networking.join(', ')}\n`;
      context += '---\n';
      
      return `Aja como um Engenheiro de Infraestrutura Sênior e Arquiteto de Soluções com mais de 15 anos de experiência prática projetando, implementando e gerenciando ambientes de TI complexos, seguros e escaláveis. Sua expertise abrange tanto infraestruturas tradicionais (On-Premise) quanto ecossistemas modernos de Cloud e práticas DevOps. Sua missão é fornecer consultoria técnica de alto nível. Analise o cenário, a tecnologia e a dúvida do usuário para oferecer uma resposta detalhada, estruturada e acionável, considerando sempre as melhores práticas de segurança, performance, resiliência e otimização de custos.

${context}
DÚVIDA/CENÁRIO DO USUÁRIO:
${formData.scenario}
---
FORMATO DA RESPOSTA (OBRIGATÓRIO):
Siga estritamente a estrutura abaixo, utilizando markdown para formatação. Para blocos de código, use a sintaxe \`\`\` (ex: \`\`\`yaml).

**Diagnóstico:**
Comece com um parágrafo resumindo seu entendimento do problema e do objetivo do usuário.

**Solução Recomendada:**
Apresente a solução de forma clara e estruturada. Se for um plano de ação, use uma lista numerada com os passos a serem seguidos.

**Exemplos Práticos:**
Onde for relevante, forneça exemplos de código (ex: \`main.tf\` para Terraform, \`playbook.yml\` para Ansible, \`deployment.yaml\` para Kubernetes) ou comandos de CLI.

**Considerações Importantes:**
Adicione uma seção de "Pontos de Atenção" que destaque aspectos cruciais como segurança, custos, escalabilidade e manutenção.

**Conclusão:**
Finalize com um resumo da solução.
`;
  }

 const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};
    if (step === 1 && !formData.mainEnvironment) {
        newErrors.mainEnvironment = "Por favor, selecione o ambiente principal.";
    }
    if (step === 3 && !formData.scenario.trim()) {
        newErrors.scenario = "Por favor, descreva sua dúvida ou cenário.";
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
 };


  const handleNextStep = () => {
      if (validateStep(currentStep)) {
          if (currentStep < 4) setCurrentStep(currentStep + 1);
      }
  };

  const handlePrevStep = () => {
      if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  
  const handleStepClick = (step: number) => {
    if (step < currentStep) {
        setFormErrors({});
        setCurrentStep(step);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(3)) {
        return;
    }
    
    setIsLoading(true);
    setApiError('');
    
    const initialUserMessage: ChatMessage = { role: 'user', text: formData.scenario };
    setChatHistory([initialUserMessage]);
    setChatSession(null);

    const prompt = buildPrompt();
    try {
        const { chat, firstResponse } = await startChat(prompt);
        setChatSession(chat);
        const modelMessage: ChatMessage = { role: 'model', text: firstResponse };
        setChatHistory(prev => [...prev, modelMessage]);
    } catch (error) {
        const errorMessageText = error instanceof Error ? `Desculpe, ocorreu um erro: ${error.message}` : `Desculpe, ocorreu um erro desconhecido.`;
        const errorMessage: ChatMessage = { role: 'model', text: errorMessageText };
        setChatHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!chatSession || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: message };
    setChatHistory(prev => [...prev, userMessage]);
    setIsLoading(true);
    setApiError('');

    try {
        const response = await chatSession.sendMessage({ message });
        const modelMessage: ChatMessage = { role: 'model', text: response.text };
        setChatHistory(prev => [...prev, modelMessage]);
    } catch (error) {
        const errorMessageText = error instanceof Error ? `Desculpe, ocorreu um erro: ${error.message}` : `Desculpe, ocorreu um erro desconhecido.`;
        const errorMessage: ChatMessage = { role: 'model', text: errorMessageText };
        setChatHistory(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  }
  
  const showCloudProviders = ['Cloud (Nuvem Pública)', 'Híbrido (Cloud + On-Premise)', 'Multi-Cloud (Múltiplas Nuvens Públicas)'].includes(formData.mainEnvironment);
  
  const ReviewSection: React.FC<{title: string; data: string | string[]}> = ({title, data}) => {
      if (!data || (Array.isArray(data) && data.length === 0)) return null;
      return (
          <div>
              <p className="font-semibold text-gray-600 dark:text-gray-300">{title}:</p>
              <p className="pl-4 text-sm text-gray-800 dark:text-gray-100">{Array.isArray(data) ? data.join(', ') : data}</p>
          </div>
      );
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-base-200 dark:bg-base-dark-200 text-base-content dark:text-base-dark-content">
      <div className="max-w-screen-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Consultor de Infraestrutura IA</h1>
          <p className="mt-2 text-lg text-base-content/80 dark:text-base-dark-content/80">Seu arquiteto de soluções sênior, sempre disponível.</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-base-100 dark:bg-base-dark-100 p-6 rounded-2xl shadow-lg flex flex-col h-full">
            <WizardStepper currentStep={currentStep} onStepClick={handleStepClick} />
            <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
              <div className="flex-grow">
                {currentStep === 1 && (
                   <div>
                       <h2 className="text-xl font-bold mb-4">Etapa 1: Ambiente Principal</h2>
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Selecione a base da sua infraestrutura. Esta é uma escolha fundamental que influenciará as próximas opções.</p>
                       <SelectionGroup title="Qual é o seu ambiente principal? *" options={MAIN_ENV_OPTIONS} selected={formData.mainEnvironment} onChange={(val) => handleSelectionChange('mainEnvironment', val)} type="radio" name="mainEnvironment" hasError={!!formErrors.mainEnvironment} />
                       {formErrors.mainEnvironment && <p className="text-red-500 text-sm mt-1 ml-1">{formErrors.mainEnvironment}</p>}
                   </div>
                )}
                {currentStep === 2 && (
                   <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                       <h2 className="text-xl font-bold mb-4 sticky top-0 bg-base-100 dark:bg-base-dark-100 py-2">Etapa 2: Tecnologias e Ferramentas</h2>
                       <p className="text-sm text-gray-600 dark:text-gray-400 -mt-4 mb-4">Selecione as tecnologias que você usa ou planeja usar. Pode pular esta etapa se não for relevante.</p>
                       {showCloudProviders && <SelectionGroup title="Provedores de Cloud" options={CLOUD_PROVIDERS_OPTIONS} selected={formData.cloudProviders} onChange={(val) => handleSelectionChange('cloudProviders', val)} type="checkbox" />}
                       <SelectionGroup title="Virtualização e Contêineres" options={VIRTUALIZATION_OPTIONS} selected={formData.virtualization} onChange={(val) => handleSelectionChange('virtualization', val)} type="checkbox" />
                       <SelectionGroup title="IaC e Gerenciamento de Configuração" options={IAC_OPTIONS} selected={formData.iac} onChange={(val) => handleSelectionChange('iac', val)} type="checkbox" />
                       <SelectionGroup title="CI/CD - Integração e Entrega Contínua" options={CICD_OPTIONS} selected={formData.cicd} onChange={(val) => handleSelectionChange('cicd', val)} type="checkbox" />
                       <SelectionGroup title="Monitoramento, Logs e Observabilidade" options={MONITORING_OPTIONS} selected={formData.monitoring} onChange={(val) => handleSelectionChange('monitoring', val)} type="checkbox" />
                       <SelectionGroup title="Redes e Segurança" options={NETWORKING_SECURITY_OPTIONS} selected={formData.networking} onChange={(val) => handleSelectionChange('networking', val)} type="checkbox" />
                   </div>
                )}
                {currentStep === 3 && (
                   <div>
                       <h2 className="text-xl font-bold mb-4">Etapa 3: Descreva seu Cenário</h2>
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Detalhe aqui o seu problema, contexto atual e objetivo final. Quanto mais detalhes você fornecer, melhor será a análise da IA.</p>
                       <h3 className={`font-semibold text-md mb-2 ${formErrors.scenario ? 'text-red-500' : ''}`}>Sua Dúvida, Cenário ou Desafio *</h3>
                       <textarea
                         value={formData.scenario}
                         onChange={handleScenarioChange}
                         rows={12}
                         placeholder="Exemplo: Estou migrando uma aplicação monolítica de um servidor on-premise para a AWS. A aplicação usa um banco de dados PostgreSQL. Quero usar contêineres e garantir alta disponibilidade. Qual a melhor arquitetura?"
                         className={`w-full p-3 text-sm bg-base-200 dark:bg-base-dark-200 border rounded-md focus:ring-2 transition ${formErrors.scenario ? 'border-red-500 focus:ring-red-500/50' : 'border-base-300 dark:border-base-dark-300 focus:ring-brand-primary focus:border-brand-primary'}`}
                         aria-invalid={!!formErrors.scenario}
                         aria-describedby="scenario-error"
                       />
                       {formErrors.scenario && <p id="scenario-error" className="text-red-500 text-sm mt-1">{formErrors.scenario}</p>}
                   </div>
                )}
                {currentStep === 4 && (
                   <div className="space-y-4">
                       <h2 className="text-xl font-bold mb-4">Etapa 4: Revise e Gere a Solução</h2>
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Confira as informações fornecidas. Se tudo estiver correto, clique em "Gerar Solução" para receber a análise da IA.</p>
                       <div className="p-4 bg-base-200/50 dark:bg-base-dark-200/50 rounded-lg space-y-3">
                            <ReviewSection title="Ambiente Principal" data={formData.mainEnvironment} />
                            <ReviewSection title="Provedores de Cloud" data={formData.cloudProviders} />
                            <ReviewSection title="Virtualização e Contêineres" data={formData.virtualization} />
                            <ReviewSection title="IaC" data={formData.iac} />
                            <ReviewSection title="CI/CD" data={formData.cicd} />
                            <ReviewSection title="Monitoramento" data={formData.monitoring} />
                            <ReviewSection title="Redes e Segurança" data={formData.networking} />
                       </div>
                   </div>
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t border-base-300 dark:border-base-dark-300 flex justify-between items-center">
                <button type="button" onClick={handlePrevStep} disabled={currentStep === 1} className="bg-base-300 dark:bg-base-dark-300 hover:bg-base-300/80 dark:hover:bg-base-dark-300/80 text-base-content dark:text-base-dark-content font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Anterior
                </button>

                {currentStep < 4 ? (
                     <button type="button" onClick={handleNextStep} className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-2 px-4 rounded-lg transition-colors">
                         Próximo
                     </button>
                ) : (
                    <button type="submit" disabled={isLoading} className="w-48 flex justify-center items-center gap-2 bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-brand-primary/50">
                        {isLoading ? 'Analisando...' : 'Gerar Solução'}
                    </button>
                )}
              </div>
            </form>
          </div>
          
          <div className="h-[calc(100vh-10rem)] sticky top-8">
             <ChatWindow chatHistory={chatHistory} isLoading={isLoading} onSendMessage={handleSendMessage} />
             {apiError && <p className="text-red-500 mt-4 text-center">{apiError}</p>}
          </div>

        </main>
      </div>
    </div>
  );
}

export default App;
