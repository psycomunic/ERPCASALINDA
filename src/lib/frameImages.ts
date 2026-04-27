export function getFrameImage(frameName: string): string | null {
  if (!frameName) return null;
  const lower = frameName.toLowerCase();
  
  if (lower.includes('borda infinita')) return '/frames/borda-infinita.jpg';
  if (lower.includes('canaleta')) return '/frames/moldura-canaleta.png';
  if (lower.includes('premium') && lower.includes('vidro')) return '/frames/premium-vidro.png';

  // Flutuante
  if (lower.includes('flutuante')) {
    if (lower.includes('preta') || lower.includes('preto')) return '/frames/flutuante-preta.png';
    if (lower.includes('branc')) return '/frames/flutuante-branca.png';
    if (lower.includes('dourad')) return '/frames/flutuante-dourada.jpg';
    if (lower.includes('madeira')) return '/frames/flutuante-madeira.jpg';
  }

  // Concava
  if (lower.includes('concava') || lower.includes('côncava')) {
    if (lower.includes('preta') || lower.includes('preto')) return '/frames/concava-preta.png';
    if (lower.includes('branc')) return '/frames/concava-branca.jpg';
    if (lower.includes('dourad')) return '/frames/concava-dourada.png';
    if (lower.includes('madeira')) return '/frames/concava-madeira.jpg';
  }

  // Imperial / Majestic types
  if (lower.includes('barroco')) return '/frames/barroco-imperial.jpg';
  if (lower.includes('galeria') && lower.includes('v2')) return '/frames/galeria-imperial-v2.jpg';
  if (lower.includes('galeria')) return '/frames/galeria-imperial.jpg';
  if (lower.includes('majestade')) return '/frames/majestade-negra.jpg';
  if (lower.includes('palaciana')) return '/frames/palaciana.jpg';
  if (lower.includes('roma') || lower.includes('moderna')) return '/frames/roma-moderna.jpg';
  if (lower.includes('trono') && lower.includes('v2')) return '/frames/trono-de-ouro-v2.jpg';
  if (lower.includes('trono')) return '/frames/trono-de-ouro.jpg';
  if (lower.includes('prata e ouro')) return '/frames/imperial-prata-e-ouro.jpg';
  if (lower.includes('realce')) return '/frames/realce-imperial.jpg';
  if (lower.includes('inox')) return '/frames/inox.jpg';

  // Caixa (Padrão) - Default for regular colors
  if (lower.includes('pret')) return '/frames/caixa-preta.png';
  if (lower.includes('branc')) return '/frames/caixa-branca.png';
  if (lower.includes('dourad')) return '/frames/caixa-dourada.png';
  if (lower.includes('escura')) return '/frames/caixa-madeira-escura.png';
  if (lower.includes('madeira') || lower.includes('carvalho') || lower.includes('marrom') || lower.includes('freijó')) return '/frames/caixa-madeira.png';

  return null;
}
