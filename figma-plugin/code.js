// FitSculpt Professional Wireframe Generator v2
// Creates 3 professional iOS-style screens in Figma

// Color scheme - Professional iOS style
const colors = {
  primary: '#0D99FF',
  secondary: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  background: '#F2F2F7',
  card: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  border: '#E5E5EA',
  gradient1: '#0D99FF',
  gradient2: '#0066CC'
};

// Font
const fontFamily = 'Inter';

function createText(text, x, y, fontSize, color, weight = 400, width = 200) {
  return figma.createText();
}

function createRect(x, y, width, height, color, radius = 0) {
  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.width = width;
  rect.height = height;
  rect.fill = color;
  if (radius > 0) rect.cornerRadius = radius;
  return rect;
}

function createFrame(name, width, height) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.width = width;
  frame.height = height;
  return frame;
}

// SCREEN 1: Seguimiento / Progress Hub
function createScreen1(container) {
  const screen = figma.createFrame();
  screen.name = '1-Seguimiento';
  screen.width = 375;
  screen.height = 812;
  screen.backgroundColor = colors.background;
  
  // Header
  const title = figma.createText();
  title.characters = 'Progreso';
  title.fontSize = 32;
  title.fontName = { family: fontFamily, style: 'Bold' };
  title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  title.x = 20;
  title.y = 50;
  screen.appendChild(title);
  
  const subtitle = figma.createText();
  subtitle.characters = 'Hola, Carlos';
  subtitle.fontSize = 14;
  subtitle.fontName = { family: fontFamily, style: 'Regular' };
  subtitle.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
  subtitle.x = 20;
  subtitle.y = 88;
  screen.appendChild(subtitle);
  
  // Status Card with gradient
  const statusCard = figma.createRectangle();
  statusCard.x = 20;
  statusCard.y = 120;
  statusCard.width = 335;
  statusCard.height = 100;
  statusCard.cornerRadius = 16;
  statusCard.fills = [{ type: 'SOLID', color: { r: 0.051, g: 0.6, b: 1 } }];
  screen.appendChild(statusCard);
  
  const statusText = figma.createText();
  statusText.characters = 'Vas bien esta semana';
  statusText.fontSize = 18;
  statusText.fontName = { family: fontFamily, style: 'Semibold' };
  statusText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  statusText.x = 30;
  statusText.y = 135;
  screen.appendChild(statusText);
  
  const statusSub = figma.createText();
  statusSub.characters = 'Sigue así, cada vez más cerca de tu objetivo';
  statusSub.fontSize = 13;
  statusSub.fontName = { family: fontFamily, style: 'Regular' };
  statusSub.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.8 } }];
  statusSub.x = 30;
  statusSub.y = 160;
  screen.appendChild(statusSub);
  
  // CTA Button
  const cta = figma.createRectangle();
  cta.x = 90;
  cta.y = 195;
  cta.width = 195;
  cta.height = 40;
  cta.cornerRadius = 20;
  cta.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  screen.appendChild(cta);
  
  const ctaText = figma.createText();
  ctaText.characters = 'Registrar check-in';
  ctaText.fontSize = 14;
  ctaText.fontName = { family: fontFamily, style: 'Semibold' };
  ctaText.fills = [{ type: 'SOLID', color: { r: 0.051, g: 0.6, b: 1 } }];
  ctaText.x = 115;
  ctaText.y = 208;
  screen.appendChild(ctaText);
  
  // Stats Row
  const stats = [
    { value: '85.0', unit: 'kg', color: colors.textPrimary },
    { value: '-0.5', unit: 'kg', color: colors.secondary },
    { value: '17%', unit: 'adherir', color: colors.warning },
    { value: '3/30', unit: 'check-ins', color: colors.primary }
  ];
  
  stats.forEach((stat, i) => {
    const card = figma.createRectangle();
    card.x = 20 + (i * 82);
    card.y = 240;
    card.width = 75;
    card.height = 75;
    card.cornerRadius = 12;
    card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    screen.appendChild(card);
    
    const val = figma.createText();
    val.characters = stat.value;
    val.fontSize = 20;
    val.fontName = { family: fontFamily, style: 'Bold' };
    val.fills = [{ type: 'SOLID', color: stat.color }];
    val.x = 20 + (i * 82) + 10;
    val.y = 258;
    screen.appendChild(val);
    
    const unit = figma.createText();
    unit.characters = stat.unit;
    unit.fontSize = 10;
    unit.fontName = { family: fontFamily, style: 'Regular' };
    unit.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
    unit.x = 20 + (i * 82) + 10;
    unit.y = 282;
    screen.appendChild(unit);
  });
  
  // Trend Section
  const trendTitle = figma.createText();
  trendTitle.characters = 'Tendencias';
  trendTitle.fontSize = 16;
  trendTitle.fontName = { family: fontFamily, style: 'Semibold' };
  trendTitle.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  trendTitle.x = 20;
  trendTitle.y = 335;
  screen.appendChild(trendTitle);
  
  // Tabs
  const tabs = ['Peso', 'Nutrición', 'Entreno'];
  tabs.forEach((tab, i) => {
    const tabRect = figma.createRectangle();
    tabRect.x = 20 + (i * 90);
    tabRect.y = 360;
    tabRect.width = 80;
    tabRect.height = 32;
    tabRect.cornerRadius = 16;
    tabRect.fills = [{ type: 'SOLID', color: i === 0 ? colors.primary : colors.border }];
    screen.appendChild(tabRect);
    
    const tabText = figma.createText();
    tabText.characters = tab;
    tabText.fontSize = 12;
    tabText.fontName = { family: fontFamily, style: 'Medium' };
    tabText.fills = [{ type: 'SOLID', color: i === 0 ? { r: 1, g: 1, b: 1 } : { r: 0.557, g: 0.557, b: 0.576 } }];
    tabText.x = 20 + (i * 90) + 18;
    tabText.y = 368;
    screen.appendChild(tabText);
  });
  
  // Chart placeholder
  const chart = figma.createRectangle();
  chart.x = 20;
  chart.y = 405;
  chart.width = 335;
  chart.height = 100;
  chart.cornerRadius = 12;
  chart.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  screen.appendChild(chart);
  
  // Next Action Card
  const nextCard = figma.createRectangle();
  nextCard.x = 20;
  nextCard.y = 520;
  nextCard.width = 335;
  nextCard.height = 60;
  nextCard.cornerRadius = 12;
  nextCard.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  screen.appendChild(nextCard);
  
  const nextTitle = figma.createText();
  nextTitle.characters = 'Tu mejor siguiente paso';
  nextTitle.fontSize = 14;
  nextTitle.fontName = { family: fontFamily, style: 'Semibold' };
  nextTitle.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  nextTitle.x = 30;
  nextTitle.y = 530;
  screen.appendChild(nextTitle);
  
  const nextSub = figma.createText();
  nextSub.characters = 'Completa un check-in más esta semana';
  nextSub.fontSize = 13;
  nextSub.fontName = { family: fontFamily, style: 'Regular' };
  nextSub.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
  nextSub.x = 30;
  nextSub.y = 550;
  screen.appendChild(nextSub);
  
  // Preview Cards
  const previews = [
    { title: 'Revisión semanal', sub: 'Pendiente', arrow: '→' },
    { title: 'Body Scan', sub: '22.1% · Media', arrow: '→' }
  ];
  
  previews.forEach((p, i) => {
    const card = figma.createRectangle();
    card.x = 20;
    card.y = 595 + (i * 70);
    card.width = 335;
    card.height = 60;
    card.cornerRadius = 12;
    card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    screen.appendChild(card);
    
    const title = figma.createText();
    title.characters = p.title;
    title.fontSize = 14;
    title.fontName = { family: fontFamily, style: 'Medium' };
    title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    title.x = 30;
    title.y = 605 + (i * 70);
    screen.appendChild(title);
    
    const sub = figma.createText();
    sub.characters = p.sub + ' ' + p.arrow;
    sub.fontSize = 12;
    sub.fontName = { family: fontFamily, style: 'Regular' };
    sub.fills = [{ type: 'SOLID', color: colors.primary }];
    sub.x = 30;
    sub.y = 625 + (i * 70);
    screen.appendChild(sub);
  });
  
  // Bottom Nav
  const nav = figma.createRectangle();
  nav.x = 0;
  nav.y = 752;
  nav.width = 375;
  nav.height = 60;
  nav.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  screen.appendChild(nav);
  
  const navItems = ['Progreso', 'Hoy', 'Biblioteca', 'Perfil'];
  navItems.forEach((item, i) => {
    const navText = figma.createText();
    navText.characters = item;
    navText.fontSize = 10;
    navText.fontName = { family: fontFamily, style: 'Medium' };
    navText.fills = [{ type: 'SOLID', color: i === 0 ? colors.primary : { r: 0.557, g: 0.557, b: 0.576 } }];
    navText.x = 20 + (i * 93);
    navText.y = 775;
    screen.appendChild(navText);
  });
  
  container.appendChild(screen);
  return screen;
}

// SCREEN 2: Body Scan Report
function createScreen2(container) {
  const screen = figma.createFrame();
  screen.name = '2-Body-Scan-Report';
  screen.width = 375;
  screen.height = 812;
  screen.backgroundColor = colors.background;
  
  // Header
  const title = figma.createText();
  title.characters = 'Body Scan';
  title.fontSize = 32;
  title.fontName = { family: fontFamily, style: 'Bold' };
  title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  title.x = 20;
  title.y = 50;
  screen.appendChild(title);
  
  const subtitle = figma.createText();
  subtitle.characters = 'Última lectura: 27/04/2026 · 1 fuente';
  subtitle.fontSize = 12;
  subtitle.fontName = { family: fontFamily, style: 'Regular' };
  subtitle.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
  subtitle.x = 20;
  subtitle.y = 88;
  screen.appendChild(subtitle);
  
  // CTA
  const cta = figma.createRectangle();
  cta.x = 20;
  cta.y = 110;
  cta.width = 140;
  cta.height = 36;
  cta.cornerRadius = 18;
  cta.fills = [{ type: 'SOLID', color: colors.primary }];
  screen.appendChild(cta);
  
  const ctaText = figma.createText();
  ctaText.characters = 'Actualizar fotos';
  ctaText.fontSize = 12;
  ctaText.fontName = { family: fontFamily, style: 'Medium' };
  ctaText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  ctaText.x = 35;
  ctaText.y = 121;
  screen.appendChild(ctaText);
  
  // Main Result
  const resultCard = figma.createRectangle();
  resultCard.x = 20;
  resultCard.y = 160;
  resultCard.width = 335;
  resultCard.height = 140;
  resultCard.cornerRadius = 16;
  resultCard.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  screen.appendChild(resultCard);
  
  const resultNum = figma.createText();
  resultNum.characters = '22.1%';
  resultNum.fontSize = 48;
  resultNum.fontName = { family: fontFamily, style: 'Bold' };
  resultNum.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  resultNum.x = 30;
  resultNum.y = 175;
  screen.appendChild(resultNum);
  
  const resultLabel = figma.createText();
  resultLabel.characters = 'Grasa corporal estimada';
  resultLabel.fontSize = 14;
  resultLabel.fontName = { family: fontFamily, style: 'Regular' };
  resultLabel.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
  resultLabel.x = 30;
  resultLabel.y = 230;
  screen.appendChild(resultLabel);
  
  const confidence = figma.createRectangle();
  confidence.x = 30;
  confidence.y = 255;
  confidence.width = 80;
  confidence.height = 24;
  confidence.cornerRadius = 12;
  confidence.fills = [{ type: 'SOLID', color: { r: 1, g: 0.8, b: 0 } }];
  screen.appendChild(confidence);
  
  const confText = figma.createText();
  confText.characters = 'Media · 60/100';
  confText.fontSize = 11;
  confText.fontName = { family: fontFamily, style: 'Medium' };
  confText.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.4, b: 0 } }];
  confText.x = 40;
  confText.y = 261;
  screen.appendChild(confText);
  
  // Range
  const range = figma.createText();
  range.characters = 'Rango: 18.2% - 26.0%';
  range.fontSize = 13;
  range.fontName = { family: fontFamily, style: 'Regular' };
  range.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
  range.x = 140;
  range.y = 258;
  screen.appendChild(range);
  
  // Mass Cards
  const masses = [
    { label: 'Masa magra', value: '66.2', unit: 'kg', x: 20 },
    { label: 'Masa grasa', value: '18.8', unit: 'kg', x: 180 }
  ];
  
  masses.forEach(m => {
    const card = figma.createRectangle();
    card.x = m.x;
    card.y = 315;
    card.width = 160;
    card.height = 70;
    card.cornerRadius = 12;
    card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    screen.appendChild(card);
    
    const label = figma.createText();
    label.characters = m.label;
    label.fontSize = 11;
    label.fontName = { family: fontFamily, style: 'Regular' };
    label.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
    label.x = m.x + 15;
    label.y = 330;
    screen.appendChild(label);
    
    const value = figma.createText();
    value.characters = m.value;
    value.fontSize = 22;
    value.fontName = { family: fontFamily, style: 'Bold' };
    value.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    value.x = m.x + 15;
    value.y = 350;
    screen.appendChild(value);
    
    const unit = figma.createText();
    unit.characters = m.unit;
    unit.fontSize = 12;
    unit.fontName = { family: fontFamily, style: 'Regular' };
    unit.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
    unit.x = m.x + 75;
    unit.y = 355;
    screen.appendChild(unit);
  });
  
  // What it means
  const meaningCard = figma.createRectangle();
  meaningCard.x = 20;
  meaningCard.y = 400;
  meaningCard.width = 335;
  meaningCard.height = 100;
  meaningCard.cornerRadius = 12;
  meaningCard.fills = [{ type: 'SOLID', color: { r: 1, g: 0.95, b: 0.7 } }];
  screen.appendChild(meaningCard);
  
  const meaningTitle = figma.createText();
  meaningTitle.characters = 'Qué significa';
  meaningTitle.fontSize = 14;
  meaningTitle.fontName = { family: fontFamily, style: 'Semibold' };
  meaningTitle.fills = [{ type: 'SOLID', color: { r: 0.7, g: 0.4, b: 0 } }];
  meaningTitle.x = 30;
  meaningTitle.y = 412;
  screen.appendChild(meaningTitle);
  
  const bullets = [
    'Lectura compatible con objetivo de recomposición',
    'La señal aún es media - faltan más datos',
    'Necesitas más consistencia en logging'
  ];
  
  bullets.forEach((b, i) => {
    const bullet = figma.createText();
    bullet.characters = '• ' + b;
    bullet.fontSize = 12;
    bullet.fontName = { family: fontFamily, style: 'Regular' };
    bullet.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.4, b: 0 } }];
    bullet.x = 30;
    bullet.y = 435 + (i * 18);
    screen.appendChild(bullet);
  });
  
  // Next step
  const nextCard = figma.createRectangle();
  nextCard.x = 20;
  nextCard.y = 515;
  nextCard.width = 335;
  nextCard.height = 60;
  nextCard.cornerRadius = 12;
  nextCard.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  screen.appendChild(nextCard);
  
  const nextTitle = figma.createText();
  nextTitle.characters = 'Siguiente paso';
  nextTitle.fontSize = 14;
  nextTitle.fontName = { family: fontFamily, style: 'Semibold' };
  nextTitle.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  nextTitle.x = 30;
  nextTitle.y = 525;
  screen.appendChild(nextTitle);
  
  const nextSub = figma.createText();
  nextSub.characters = 'Completar estimación manual de body fat';
  nextSub.fontSize = 13;
  nextSub.fontName = { family: fontFamily, style: 'Regular' };
  nextSub.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
  nextSub.x = 30;
  nextSub.y = 545;
  screen.appendChild(nextSub);
  
  // AI Scan Option
  const aiCard = figma.createRectangle();
  aiCard.x = 20;
  aiCard.y = 590;
  aiCard.width = 335;
  aiCard.height = 80;
  aiCard.cornerRadius = 12;
  aiCard.fills = [{ type: 'SOLID', color: { r: 0.93, g: 0.91, b: 0.99 } }];
  screen.appendChild(aiCard);
  
  const aiTitle = figma.createText();
  aiTitle.characters = 'Escaneo completo premium';
  aiTitle.fontSize = 14;
  aiTitle.fontName = { family: fontFamily, style: 'Semibold' };
  aiTitle.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.2, b: 0.9 } }];
  aiTitle.x = 30;
  aiTitle.y = 605;
  screen.appendChild(aiTitle);
  
  const aiBtn = figma.createRectangle();
  aiBtn.x = 30;
  aiBtn.y = 630;
  aiBtn.width = 160;
  aiBtn.height = 32;
  aiBtn.cornerRadius = 16;
  aiBtn.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.2, b: 0.9 } }];
  screen.appendChild(aiBtn);
  
  const aiBtnText = figma.createText();
  aiBtnText.characters = 'Abrir scan completo';
  aiBtnText.fontSize = 12;
  aiBtnText.fontName = { family: fontFamily, style: 'Medium' };
  aiBtnText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  aiBtnText.x = 50;
  aiBtnText.y = 638;
  screen.appendChild(aiBtnText);
  
  container.appendChild(screen);
  return screen;
}

// SCREEN 3: Weekly Review
function createScreen3(container) {
  const screen = figma.createFrame();
  screen.name = '3-Weekly-Review';
  screen.width = 375;
  screen.height = 812;
  screen.backgroundColor = colors.background;
  
  // Header
  const title = figma.createText();
  title.characters = 'Revisión semanal';
  title.fontSize = 28;
  title.fontName = { family: fontFamily, style: 'Bold' };
  title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  title.x = 20;
  title.y = 50;
  screen.appendChild(title);
  
  const subtitle = figma.createText();
  subtitle.characters = '20/04 - 27/04 · Necesita decisión';
  subtitle.fontSize = 12;
  subtitle.fontName = { family: fontFamily, style: 'Regular' };
  subtitle.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
  subtitle.x = 20;
  subtitle.y = 85;
  screen.appendChild(subtitle);
  
  // Stats Row
  const stats = [
    { label: 'Adherencia', value: '17%', color: colors.warning },
    { label: 'Peso', value: '-0.5 kg', color: colors.secondary },
    { label: 'Nutrición', value: '0%', color: colors.textSecondary },
    { label: 'Energía', value: '3.0', color: colors.primary }
  ];
  
  stats.forEach((stat, i) => {
    const card = figma.createRectangle();
    card.x = 20 + (i * 82);
    card.y = 115;
    card.width = 75;
    card.height = 70;
    card.cornerRadius = 12;
    card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    screen.appendChild(card);
    
    const label = figma.createText();
    label.characters = stat.label;
    label.fontSize = 10;
    label.fontName = { family: fontFamily, style: 'Regular' };
    label.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
    label.x = 20 + (i * 82) + 8;
    label.y = 128;
    screen.appendChild(label);
    
    const value = figma.createText();
    value.characters = stat.value;
    value.fontSize = 18;
    value.fontName = { family: fontFamily, style: 'Bold' };
    value.fills = [{ type: 'SOLID', color: stat.color }];
    value.x = 20 + (i * 82) + 8;
    value.y = 148;
    screen.appendChild(value);
  });
  
  // Decision Section Title
  const decisionTitle = figma.createText();
  decisionTitle.characters = 'Decisiones recomendadas';
  decisionTitle.fontSize = 16;
  decisionTitle.fontName = { family: fontFamily, style: 'Semibold' };
  decisionTitle.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  decisionTitle.x = 20;
  decisionTitle.y = 205;
  screen.appendChild(decisionTitle);
  
  // Decision Card
  const decisionCard = figma.createRectangle();
  decisionCard.x = 20;
  decisionCard.y = 235;
  decisionCard.width = 335;
  decisionCard.height = 160;
  decisionCard.cornerRadius = 16;
  decisionCard.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.98, b: 0.85 } }];
  screen.appendChild(decisionCard);
  
  const recTitle = figma.createText();
  recTitle.characters = 'Aumentar frecuencia de entreno';
  recTitle.fontSize = 16;
  recTitle.fontName = { family: fontFamily, style: 'Semibold' };
  recTitle.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.6, b: 0.2 } }];
  recTitle.x = 30;
  recTitle.y = 250;
  screen.appendChild(recTitle);
  
  const recDesc = figma.createText();
  recDesc.characters = 'Frecuencia por debajo de referencia del perfil';
  recDesc.fontSize = 13;
  recDesc.fontName = { family: fontFamily, style: 'Regular' };
  recDesc.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.6, b: 0.2 } }];
  recDesc.x = 30;
  recDesc.y = 275;
  screen.appendChild(recDesc);
  
  // Chips
  const chips = ['2 sesiones', 'objetivo 4'];
  chips.forEach((chip, i) => {
    const chipRect = figma.createRectangle();
    chipRect.x = 30 + (i * 90);
    chipRect.y = 300;
    chipRect.width = 80;
    chipRect.height = 24;
    chipRect.cornerRadius = 12;
    chipRect.fills = [{ type: 'SOLID', color: { r: 0.73, g: 0.97, b: 0.81 } }];
    screen.appendChild(chipRect);
    
    const chipText = figma.createText();
    chipText.characters = chip;
    chipText.fontSize = 11;
    chipText.fontName = { family: fontFamily, style: 'Medium' };
    chipText.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.6, b: 0.2 } }];
    chipText.x = 40 + (i * 90);
    chipText.y = 307;
    screen.appendChild(chipText);
  });
  
  // CTAs
  const acceptBtn = figma.createRectangle();
  acceptBtn.x = 30;
  acceptBtn.y = 345;
  acceptBtn.width = 140;
  acceptBtn.height = 40;
  acceptBtn.cornerRadius = 20;
  acceptBtn.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.6, b: 0.2 } }];
  screen.appendChild(acceptBtn);
  
  const acceptText = figma.createText();
  acceptText.characters = 'Aceptar';
  acceptText.fontSize = 14;
  acceptText.fontName = { family: fontFamily, style: 'Medium' };
  acceptText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  acceptText.x = 65;
  acceptText.y = 358;
  screen.appendChild(acceptText);
  
  const keepBtn = figma.createRectangle();
  keepBtn.x = 185;
  keepBtn.y = 345;
  keepBtn.width = 140;
  keepBtn.height = 40;
  keepBtn.cornerRadius = 20;
  keepBtn.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  screen.appendChild(keepBtn);
  
  const keepText = figma.createText();
  keepText.characters = 'Mantener';
  keepText.fontSize = 14;
  keepText.fontName = { family: fontFamily, style: 'Medium' };
  keepText.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.35 } }];
  keepText.x = 220;
  keepText.y = 358;
  screen.appendChild(keepText);
  
  // Evidence Link
  const evidence = figma.createText();
  evidence.characters = 'Ver evidencia ▼';
  evidence.fontSize = 12;
  evidence.fontName = { family: fontFamily, style: 'Regular' };
  evidence.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
  evidence.x = 147;
  evidence.y = 410;
  screen.appendChild(evidence);
  
  // Support Links
  const links = ['Proyección →', 'Body scan →'];
  links.forEach((link, i) => {
    const linkText = figma.createText();
    linkText.characters = link;
    linkText.fontSize = 12;
    linkText.fontName = { family: fontFamily, style: 'Regular' };
    linkText.fills = [{ type: 'SOLID', color: { r: 0.557, g: 0.557, b: 0.576 } }];
    linkText.x = 20 + (i * 170);
    linkText.y = 440;
    screen.appendChild(linkText);
  });
  
  // Bottom Nav
  const nav = figma.createRectangle();
  nav.x = 0;
  nav.y = 752;
  nav.width = 375;
  nav.height = 60;
  nav.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  screen.appendChild(nav);
  
  const navItems = ['Progreso', 'Hoy', 'Biblioteca', 'Perfil'];
  navItems.forEach((item, i) => {
    const navText = figma.createText();
    navText.characters = item;
    navText.fontSize = 10;
    navText.fontName = { family: fontFamily, style: 'Medium' };
    navText.fills = [{ type: 'SOLID', color: i === 1 ? colors.primary : { r: 0.557, g: 0.557, b: 0.576 } }];
    navText.x = 20 + (i * 93);
    navText.y = 775;
    screen.appendChild(navText);
  });
  
  container.appendChild(screen);
  return screen;
}

// Main
const container = figma.createFrame();
container.name = 'FitSculpt Progress Wireframes';
container.width = 1200;
container.height = 812;

createScreen1(container);
createScreen2(container);
createScreen3(container);

figma.currentPage.appendChild(container);
figma.currentPage.selection = [container];
figma.viewport.scrollAndZoomToView(container);

figma.closePlugin('¡Wireframes creados! 3 pantallas generadas.');