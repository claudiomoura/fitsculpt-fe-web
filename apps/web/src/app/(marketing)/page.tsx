"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { LandingHomePage, type LandingCopy } from "@/components/landing/LandingHomePage";

function isNativeShell() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (["fs_app", "fsApp", "nativeApp", "capacitor"].some((param) => {
    const value = params.get(param)?.toLowerCase();
    return value === "1" || value === "true" || value === "yes" || value === "on";
  })) {
    return true;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes("capacitor") || ua.includes("com.fitsculpt.beta") || (ua.includes("android") && ua.includes("; wv)"));
}

function useHomeCopy(): LandingCopy {
  const { locale } = useLanguage();

  return useMemo(() => {
    if (locale === "en") {
      return {
        hero: {
          eyebrow: "AI fitness + nutrition system",
          title: "Stop guessing what to change next.",
          accent: "FitSculpt adapts the plan.",
          subtitle:
            "FitSculpt combines AI training, nutrition guidance, progress tracking, body scan context, and weekly reviews so your next move is clear.",
          primaryCta: "Create your plan",
          secondaryCta: "See the loop",
        },
        proof: {
          label: "Product signals, not hype",
          pills: [
            { label: "Plan", value: "Training + nutrition" },
            { label: "Review", value: "Weekly adjustments" },
            { label: "Signals", value: "Body scan + Health Connect" },
            { label: "Access", value: "Mobile-first web app" },
          ],
        },
        problem: {
          eyebrow: "The gap",
          title: "Most fitness apps stop at a static plan.",
          subtitle:
            "A workout sheet and calorie target are not enough when adherence, recovery, activity, and body composition change every week.",
          items: [
            { eyebrow: "Guesswork", title: "Training does not react", description: "Miss a session or plateau and the plan usually stays the same." },
            { eyebrow: "Friction", title: "Nutrition is hard to sustain", description: "Rigid meal plans break when preferences, time, or routine change." },
            { eyebrow: "Blind spots", title: "Progress is not just weight", description: "Photos, check-ins, passive activity, and body composition context matter together." },
            { eyebrow: "Noise", title: "No weekly decision", description: "FitSculpt turns your week into one practical next action." },
          ],
        },
        solution: {
          eyebrow: "The FitSculpt loop",
          title: "One premium AI coach experience for training and nutrition.",
          subtitle:
            "Start with a personalized plan, execute the day, capture progress, and let the weekly review decide what should change next.",
          benefits: [
            "Workout structure based on goal, level, equipment, and schedule.",
            "Nutrition guidance with macros, meals, and recipes aligned to the same objective.",
            "Tracking for weight, body scan context, energy, notes, and adherence.",
            "Android and Health Connect signals can add passive activity context when enabled.",
            "Weekly review converts the data into practical training and nutrition adjustments.",
          ],
        },
        method: {
          eyebrow: "How it works",
          title: "From onboarding to next-week adjustment.",
          subtitle: "A product loop built around execution, feedback, and adaptation.",
          steps: [
            { title: "Set your target", description: "Goal, level, schedule, equipment, food preferences, and constraints shape the first plan." },
            { title: "Use the daily cockpit", description: "Open today, train from your plan, check nutrition, and complete one key action." },
            { title: "Capture progress", description: "Log check-ins, body scan context, weight, energy, notes, and passive signals where available." },
            { title: "Adapt weekly", description: "FitSculpt highlights what changed and recommends the next plan adjustment." },
          ],
        },
        signals: {
          eyebrow: "Progress intelligence",
          title: "Use the signals that explain consistency.",
          subtitle: "No fake transformations or testimonial claims. The page sells the system: better inputs and clearer weekly decisions.",
          cards: [
            { title: "Body composition context", description: "Body scan surfaces help frame visual change beyond scale weight.", metric: "scan" },
            { title: "Adherence trends", description: "Training, meals, notes, and check-ins show where the week held or broke down.", metric: "week" },
            { title: "Passive activity", description: "Android Health Connect can add steps and activity context when enabled.", metric: "sync" },
          ],
        },
        outcomes: {
          eyebrow: "Expected outcomes framework",
          title: "What progress can look like with consistent use.",
          subtitle: "Illustrative scenarios based on product workflows. They are not verified transformations or guaranteed outcomes.",
          cards: [
            { title: "Consistency baseline", timeframe: "Weeks 1-2", description: "Set your weekly rhythm for training, meals, and check-ins.", note: "Focus metric: adherence quality." },
            { title: "Early calibration", timeframe: "Weeks 3-5", description: "Weekly review adjusts plan load and macro direction from your actual logs.", note: "Focus metric: lower friction and better recovery fit." },
            { title: "Compounding execution", timeframe: "Weeks 6+", description: "Body metrics and passive activity context support smaller, smarter weekly adjustments.", note: "Focus metric: sustained compliance trend." },
          ],
        },
        faq: {
          eyebrow: "FAQ",
          title: "Practical questions before you start",
          subtitle: "Clear expectations on data, billing, and product scope.",
          items: [
            { question: "Is FitSculpt a medical service?", answer: "No. FitSculpt is a coaching and planning app and does not provide diagnosis, treatment, or emergency support." },
            { question: "Do I need Health Connect?", answer: "No. It is optional on compatible Android devices and only adds passive activity context when enabled." },
            { question: "What can I track in the app?", answer: "Training, nutrition logs, body metrics, check-ins, notes, and body scan context." },
            { question: "Can I cancel monthly plans any time?", answer: "Yes. Cancellation applies to the next cycle, and refund handling follows platform rules plus the Refunds policy." },
            { question: "Are results guaranteed?", answer: "No. Outcomes depend on adherence, recovery, and personal context." },
          ],
        },
        pricing: {
          title: "Choose your starting point",
          subtitle: "Begin with the module you need now, then upgrade when you want the full loop.",
          billingNote: "Monthly billing. Cancel when you want. Pricing may vary by market.",
          tiers: [
            { name: "TrainingAI", price: "5.99€", period: "/mo", description: "AI training plans for focused strength progress.", includes: ["AI workout planning", "Training calendar", "Progress tracking", "Exercise library"], cta: "Start training" },
            { name: "Pro", price: "9.99€", period: "/mo", description: "Training, nutrition, coach context, and weekly review.", includes: ["TrainingAI + NutriAI", "Weekly review", "Body scan context", "AI coach support"], cta: "Choose Pro", popular: true },
            { name: "NutriAI", price: "5.99€", period: "/mo", description: "Nutrition planning aligned to your goal.", includes: ["AI nutrition plans", "Macros and meals", "Recipe guidance", "Nutrition tracking"], cta: "Start nutrition" },
          ],
        },
        finalCta: {
          title: "Build your first FitSculpt plan.",
          subtitle: "Create an account and start with a product flow designed around your next week, not a generic promise.",
          placeholder: "you@email.com",
          button: "Create account",
          emailAriaLabel: "Enter your email to create your FitSculpt account",
          note: "FitSculpt does not guarantee identical results; progress depends on consistency, context, and recovery.",
        },
      };
    }

    if (locale === "pt") {
      return {
        hero: {
          eyebrow: "Sistema IA de treino + nutricao",
          title: "Para de adivinhar o que mudar a seguir.",
          accent: "O FitSculpt adapta o plano.",
          subtitle:
            "O FitSculpt combina treino com IA, orientacao nutricional, acompanhamento de progresso, contexto de body scan e revisoes semanais para tornar o proximo passo claro.",
          primaryCta: "Criar o meu plano",
          secondaryCta: "Ver o ciclo",
        },
        proof: {
          label: "Sinais de produto, nao promessas vazias",
          pills: [
            { label: "Plano", value: "Treino + nutricao" },
            { label: "Revisao", value: "Ajustes semanais" },
            { label: "Sinais", value: "Body scan + Health Connect" },
            { label: "Acesso", value: "Web app mobile-first" },
          ],
        },
        problem: {
          eyebrow: "A lacuna",
          title: "A maioria das apps fica num plano estatico.",
          subtitle:
            "Uma folha de treino e uma meta calorica nao chegam quando adesao, recuperacao, atividade e composicao corporal mudam semana a semana.",
          items: [
            { eyebrow: "Adivinhacao", title: "O treino nao reage", description: "Falha uma sessao ou estagna e o plano normalmente continua igual." },
            { eyebrow: "Friccao", title: "A nutricao e dificil de manter", description: "Planos rigidos quebram quando preferencia, tempo ou rotina mudam." },
            { eyebrow: "Pontos cegos", title: "Progresso nao e so peso", description: "Fotos, check-ins, atividade passiva e composicao corporal contam em conjunto." },
            { eyebrow: "Ruido", title: "Falta uma decisao semanal", description: "O FitSculpt transforma a semana numa proxima acao pratica." },
          ],
        },
        solution: {
          eyebrow: "O ciclo FitSculpt",
          title: "Uma experiencia premium de coach IA para treino e nutricao.",
          subtitle:
            "Comeca com um plano personalizado, executa o dia, capta progresso e deixa a revisao semanal decidir o proximo ajuste.",
          benefits: [
            "Estrutura de treino baseada em objetivo, nivel, equipamento e agenda.",
            "Orientacao nutricional com macros, refeicoes e receitas alinhadas ao mesmo objetivo.",
            "Acompanhamento de peso, body scan, energia, notas e adesao.",
            "Android e Health Connect podem adicionar contexto de atividade passiva quando ativos.",
            "A revisao semanal converte dados em ajustes praticos de treino e nutricao.",
          ],
        },
        method: {
          eyebrow: "Como funciona",
          title: "Do onboarding ao ajuste da semana seguinte.",
          subtitle: "Um ciclo de produto construido para execucao, feedback e adaptacao.",
          steps: [
            { title: "Define o objetivo", description: "Objetivo, nivel, agenda, equipamento, preferencias alimentares e restricoes moldam o primeiro plano." },
            { title: "Usa o cockpit diario", description: "Abre o dia, treina pelo plano, revê nutricao e completa uma acao principal." },
            { title: "Capta progresso", description: "Regista check-ins, body scan, peso, energia, notas e sinais passivos quando disponiveis." },
            { title: "Adapta semanalmente", description: "O FitSculpt destaca o que mudou e recomenda o proximo ajuste do plano." },
          ],
        },
        signals: {
          eyebrow: "Inteligencia de progresso",
          title: "Usa os sinais que explicam consistencia.",
          subtitle: "Sem transformacoes falsas ou testemunhos inventados. A pagina vende o sistema: melhores dados e decisoes semanais mais claras.",
          cards: [
            { title: "Contexto de composicao corporal", description: "Body scan ajuda a enquadrar mudanca visual alem do peso.", metric: "scan" },
            { title: "Tendencias de adesao", description: "Treino, refeicoes, notas e check-ins mostram onde a semana correu bem ou falhou.", metric: "sem" },
            { title: "Atividade passiva", description: "Android Health Connect pode adicionar passos e atividade quando ativo.", metric: "sync" },
          ],
        },
        outcomes: {
          eyebrow: "Estrutura de resultados esperados",
          title: "Como o progresso pode parecer com uso consistente.",
          subtitle: "Cenarios ilustrativos baseados no fluxo do produto. Nao sao transformacoes verificadas nem resultados garantidos.",
          cards: [
            { title: "Base de consistencia", timeframe: "Semanas 1-2", description: "Defines ritmo semanal para treino, refeicoes e check-ins.", note: "Metrica foco: qualidade de adesao." },
            { title: "Calibracao inicial", timeframe: "Semanas 3-5", description: "A revisao semanal ajusta carga e direcao de macros com base nos teus registos.", note: "Metrica foco: menos friccao e melhor encaixe de recuperacao." },
            { title: "Execucao acumulada", timeframe: "Semana 6+", description: "Metricas corporais e atividade passiva ajudam em ajustes semanais menores e mais inteligentes.", note: "Metrica foco: tendencia de consistencia sustentada." },
          ],
        },
        faq: {
          eyebrow: "FAQ",
          title: "Perguntas praticas antes de comecar",
          subtitle: "Expectativas claras sobre dados, faturacao e escopo do produto.",
          items: [
            { question: "O FitSculpt e um servico medico?", answer: "Nao. O FitSculpt e uma app de planeamento e coaching e nao oferece diagnostico, tratamento ou suporte de emergencia." },
            { question: "Preciso de Health Connect?", answer: "Nao. E opcional em Android compativel e so adiciona contexto de atividade passiva quando ativado." },
            { question: "O que posso acompanhar na app?", answer: "Treino, logs de nutricao, metricas corporais, check-ins, notas e contexto de body scan." },
            { question: "Posso cancelar planos mensais a qualquer momento?", answer: "Sim. O cancelamento vale para o proximo ciclo e os reembolsos seguem regras da plataforma e a politica de Reembolsos." },
            { question: "Os resultados sao garantidos?", answer: "Nao. Os resultados dependem de adesao, recuperacao e contexto pessoal." },
          ],
        },
        pricing: {
          title: "Escolhe o teu ponto de partida",
          subtitle: "Comeca pelo modulo que precisas agora e evolui quando quiseres o ciclo completo.",
          billingNote: "Faturacao mensal. Cancela quando quiseres. Precos podem variar por mercado.",
          tiers: [
            { name: "TrainingAI", price: "5,99€", period: "/mes", description: "Planos de treino IA para progresso de forca focado.", includes: ["Planeamento de treino IA", "Calendario de treino", "Acompanhamento", "Biblioteca de exercicios"], cta: "Comecar treino" },
            { name: "Pro", price: "9,99€", period: "/mes", description: "Treino, nutricao, coach e revisao semanal.", includes: ["TrainingAI + NutriAI", "Revisao semanal", "Contexto de body scan", "Suporte coach IA"], cta: "Escolher Pro", popular: true },
            { name: "NutriAI", price: "5,99€", period: "/mes", description: "Planeamento nutricional alinhado ao teu objetivo.", includes: ["Planos nutricionais IA", "Macros e refeicoes", "Receitas", "Tracking nutricional"], cta: "Comecar nutricao" },
          ],
        },
        finalCta: {
          title: "Cria o teu primeiro plano FitSculpt.",
          subtitle: "Cria conta e comeca com um fluxo pensado para a tua proxima semana, nao para uma promessa generica.",
          placeholder: "tu@email.com",
          button: "Criar conta",
          emailAriaLabel: "Introduz o email para criar a tua conta FitSculpt",
          note: "O FitSculpt nao garante resultados identicos; o progresso depende de consistencia, contexto e recuperacao.",
        },
      };
    }

    return {
      hero: {
        eyebrow: "Sistema IA de fitness + nutricion",
        title: "Deja de adivinar que cambiar despues.",
        accent: "FitSculpt adapta el plan.",
        subtitle:
          "FitSculpt combina entrenamiento con IA, guia nutricional, seguimiento de progreso, contexto de body scan y revisiones semanales para que tu siguiente paso sea claro.",
        primaryCta: "Crear mi plan",
        secondaryCta: "Ver el ciclo",
      },
      proof: {
        label: "Senales de producto, no promesas vacias",
        pills: [
          { label: "Plan", value: "Entreno + nutricion" },
          { label: "Revision", value: "Ajustes semanales" },
          { label: "Senales", value: "Body scan + Health Connect" },
          { label: "Acceso", value: "Web app mobile-first" },
        ],
      },
      problem: {
        eyebrow: "La brecha",
        title: "La mayoria de apps se quedan en un plan estatico.",
        subtitle:
          "Una rutina y un objetivo calorico no bastan cuando adherencia, recuperacion, actividad y composicion corporal cambian semana a semana.",
        items: [
          { eyebrow: "Adivinanza", title: "El entrenamiento no reacciona", description: "Fallas una sesion o te estancas y normalmente el plan sigue igual." },
          { eyebrow: "Friccion", title: "La nutricion cuesta sostenerla", description: "Los planes rigidos se rompen cuando cambian preferencias, tiempo o rutina." },
          { eyebrow: "Puntos ciegos", title: "Progreso no es solo peso", description: "Fotos, check-ins, actividad pasiva y composicion corporal importan juntas." },
          { eyebrow: "Ruido", title: "Falta una decision semanal", description: "FitSculpt convierte la semana en una siguiente accion practica." },
        ],
      },
      solution: {
        eyebrow: "El ciclo FitSculpt",
        title: "Una experiencia premium de coach IA para entreno y nutricion.",
        subtitle:
          "Empieza con un plan personalizado, ejecuta el dia, captura progreso y deja que la revision semanal decida que ajustar despues.",
        benefits: [
          "Estructura de entrenamiento segun objetivo, nivel, equipo y agenda.",
          "Guia nutricional con macros, comidas y recetas alineadas al mismo objetivo.",
          "Seguimiento de peso, body scan, energia, notas y adherencia.",
          "Android y Health Connect pueden sumar contexto de actividad pasiva si los activas.",
          "La revision semanal convierte los datos en ajustes practicos de entreno y nutricion.",
        ],
      },
      method: {
        eyebrow: "Como funciona",
        title: "Del onboarding al ajuste de la semana siguiente.",
        subtitle: "Un ciclo de producto construido para ejecutar, medir y adaptar.",
        steps: [
          { title: "Define tu objetivo", description: "Objetivo, nivel, agenda, equipo, preferencias alimentarias y restricciones dan forma al primer plan." },
          { title: "Usa el cockpit diario", description: "Abre el dia, entrena desde tu plan, revisa nutricion y completa una accion clave." },
          { title: "Captura progreso", description: "Registra check-ins, body scan, peso, energia, notas y senales pasivas cuando existan." },
          { title: "Adapta cada semana", description: "FitSculpt destaca que cambio y recomienda el siguiente ajuste del plan." },
        ],
      },
      signals: {
        eyebrow: "Inteligencia de progreso",
        title: "Usa las senales que explican la consistencia.",
        subtitle: "Sin transformaciones falsas ni testimonios inventados. La pagina vende el sistema: mejores datos y decisiones semanales mas claras.",
        cards: [
          { title: "Contexto de composicion corporal", description: "Body scan ayuda a entender cambio visual mas alla del peso.", metric: "scan" },
          { title: "Tendencias de adherencia", description: "Entreno, comidas, notas y check-ins muestran donde la semana aguanto o se rompio.", metric: "sem" },
          { title: "Actividad pasiva", description: "Android Health Connect puede anadir pasos y actividad cuando esta activo.", metric: "sync" },
        ],
      },
      outcomes: {
        eyebrow: "Marco de resultados esperados",
        title: "Como puede verse el progreso con uso constante.",
        subtitle: "Escenarios ilustrativos basados en el flujo del producto. No son transformaciones verificadas ni resultados garantizados.",
        cards: [
          { title: "Base de constancia", timeframe: "Semanas 1-2", description: "Defines un ritmo semanal de entreno, comidas y check-ins.", note: "Metrica foco: calidad de adherencia." },
          { title: "Calibracion inicial", timeframe: "Semanas 3-5", description: "La revision semanal ajusta carga y direccion de macros segun tus registros reales.", note: "Metrica foco: menos friccion y mejor ajuste de recuperacion." },
          { title: "Ejecucion acumulada", timeframe: "Semana 6+", description: "Metricas corporales y actividad pasiva ayudan a hacer ajustes semanales mas precisos.", note: "Metrica foco: tendencia de cumplimiento sostenido." },
        ],
      },
      faq: {
        eyebrow: "FAQ",
        title: "Preguntas practicas antes de empezar",
        subtitle: "Expectativas claras sobre datos, facturacion y alcance del producto.",
        items: [
          { question: "FitSculpt es un servicio medico?", answer: "No. FitSculpt es una app de planificacion y coaching, y no ofrece diagnostico, tratamiento ni soporte de emergencia." },
          { question: "Necesito Health Connect?", answer: "No. Es opcional en Android compatible y solo agrega contexto de actividad pasiva cuando lo activas." },
          { question: "Que puedo registrar en la app?", answer: "Entrenamiento, logs de nutricion, metricas corporales, check-ins, notas y contexto de body scan." },
          { question: "Puedo cancelar planes mensuales cuando quiera?", answer: "Si. La cancelacion aplica al siguiente ciclo y los reembolsos dependen de reglas de plataforma y la politica de Reembolsos." },
          { question: "Hay resultados garantizados?", answer: "No. Los resultados dependen de adherencia, recuperacion y contexto personal." },
        ],
      },
      pricing: {
        title: "Elige tu punto de partida",
        subtitle: "Empieza por el modulo que necesitas ahora y mejora cuando quieras el ciclo completo.",
        billingNote: "Facturacion mensual. Cancela cuando quieras. Los precios pueden variar por mercado.",
        tiers: [
          { name: "TrainingAI", price: "5,99€", period: "/mes", description: "Planes de entrenamiento IA para progreso de fuerza enfocado.", includes: ["Planificacion de entreno IA", "Calendario de entreno", "Seguimiento", "Biblioteca de ejercicios"], cta: "Empezar entreno" },
          { name: "Pro", price: "9,99€", period: "/mes", description: "Entreno, nutricion, coach y revision semanal.", includes: ["TrainingAI + NutriAI", "Revision semanal", "Contexto body scan", "Soporte coach IA"], cta: "Elegir Pro", popular: true },
          { name: "NutriAI", price: "5,99€", period: "/mes", description: "Planificacion nutricional alineada a tu objetivo.", includes: ["Planes de nutricion IA", "Macros y comidas", "Recetas", "Tracking nutricional"], cta: "Empezar nutricion" },
        ],
      },
      finalCta: {
        title: "Crea tu primer plan FitSculpt.",
        subtitle: "Crea una cuenta y empieza con un flujo pensado para tu proxima semana, no para una promesa generica.",
        placeholder: "tu@email.com",
        button: "Crear cuenta",
        emailAriaLabel: "Introduce tu email para crear tu cuenta FitSculpt",
        note: "FitSculpt no garantiza resultados identicos; el progreso depende de consistencia, contexto y recuperacion.",
      },
    };
  }, [locale]);
}

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = useHomeCopy();

  useEffect(() => {
    if (!isNativeShell()) return;

    const params = new URLSearchParams(searchParams?.toString());
    params.set("nativeApp", "1");
    router.replace(`/login?${params.toString()}`);
  }, [router, searchParams]);

  return <LandingHomePage copy={copy} />;
}
