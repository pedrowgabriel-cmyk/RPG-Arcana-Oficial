// Catálogo de compras da criação — fonte: docs/01 §9 (LIVRO pp. 52–65).
// Preços são o MÁXIMO da tabela: a primeira compra usa o preço máximo, sem
// barganha (p. 52). Espaço null = travessão da tabela (pequenos itens não
// ocupam espaço — lacuna C05, resolvida como 0 na criação).
// "Não se vende" (canhão, metralhadora) fica fora. Preços invertidos no
// original (óleo de lanterna, vinho) normalizados por interpretação registrada.
// `descricao` é a fala de balcão do vendedor — puro sabor, sem efeito de regra.

import type { CompraItem } from "./types";

export type CategoriaItem =
  | "armas"
  | "municao"
  | "protecoes"
  | "animais"
  | "mercearia"
  | "vestuario"
  | "armazem"
  | "farmacia";

/** Suporte de porte de arma (p. 53): fora da mochila, não ocupa espaço. */
export type SuporteArma = "coldre" | "bandoleira" | "bainha";

export interface ItemCatalogo {
  id: string;
  nome: string;
  categoria: CategoriaItem;
  /** Preço máximo da tabela, em réis. */
  preco: number;
  /** Espaço guardado na mochila; null = não especificado (conta 0). */
  espaco: number | null;
  /** Fala de balcão — ambientação, sem efeito mecânico. */
  descricao: string;
  /** Arma que pode ficar pronta num suporte. */
  suporte?: SuporteArma;
  /** Peça de roupa/proteção: a primeira unidade vai vestida (0 espaço). */
  vestivel?: boolean;
  /** Regra resumida do item (dano, carga, efeito). */
  nota?: string;
}

/** Lojas do vilarejo — cada uma com vendedor próprio (arte em public/story/vendedores). */
export interface LojaInfo {
  id: string;
  nome: string;
  vendedor: string;
  /** Saudação de balcão exibida ao entrar na loja. */
  fala: string;
  categorias: CategoriaItem[];
  /** Retrato do vendedor (quando a arte chegar). */
  imagem?: string;
}

export const LOJAS: LojaInfo[] = [
  {
    id: "armaria",
    nome: "Armaria do Rocha",
    vendedor: "Rocha, o armeiro",
    fala: "Ferro honesto pra gente honesta. E pros outros também, se pagarem adiantado.",
    categorias: ["armas", "municao"],
    imagem: "/story/vendedores/armaria.webp",
  },
  {
    id: "estabulo",
    nome: "Estábulo Dois Irmãos",
    vendedor: "Dona Firmina, a tratadora",
    fala: "Bicho meu sai escovado, ferrado e sem manha. O resto é com o cavaleiro.",
    categorias: ["animais"],
    imagem: "/story/vendedores/estabulo.webp",
  },
  {
    id: "alfaiataria",
    nome: "Alfaiataria Fino Trato",
    vendedor: "Seu Anacleto, o alfaiate",
    fala: "No Oeste, moço, a primeira impressão chega antes do coldre.",
    categorias: ["vestuario"],
    imagem: "/story/vendedores/alfaiataria.webp",
  },
  {
    id: "mercearia",
    nome: "Mercearia da Nhá Bela",
    vendedor: "Nhá Bela, a merceeira",
    fala: "Barriga vazia não atravessa o sertão. Leva um queijo, vai por mim.",
    categorias: ["mercearia"],
    imagem: "/story/vendedores/mercearia.webp",
  },
  {
    id: "armazem",
    nome: "Armazém Geral Boa Sorte",
    vendedor: "Tibúrcio, o comerciante",
    fala: "Se não tem aqui, é porque ainda não inventaram. Ou porque me roubaram.",
    categorias: ["armazem", "protecoes"],
    imagem: "/story/vendedores/armazem.webp",
  },
  {
    id: "farmacia",
    nome: "Botica do Doutor Zacarias",
    vendedor: "Dr. Zacarias, o boticário",
    fala: "Tenho remédio pra quase tudo. Pro resto, tenho morfina.",
    categorias: ["farmacia"],
    imagem: "/story/vendedores/farmacia.webp",
  },
];

export function lojaById(id: string): LojaInfo | undefined {
  return LOJAS.find((l) => l.id === id);
}

export const CATEGORIAS: { id: CategoriaItem; nome: string }[] = [
  { id: "armas", nome: "Armas" },
  { id: "municao", nome: "Munição e suportes" },
  { id: "protecoes", nome: "Proteções" },
  { id: "animais", nome: "Animais e transporte" },
  { id: "vestuario", nome: "Vestuário" },
  { id: "mercearia", nome: "Mercearia" },
  { id: "armazem", nome: "Armazém" },
  { id: "farmacia", nome: "Farmácia" },
];

export const CATALOGO: ItemCatalogo[] = [
  // ── Armas comuns (p. 56) ──
  { id: "revolver", nome: "Revólver", categoria: "armas", preco: 25, espaco: 1, suporte: "coldre", nota: "Dano 1V · carga 6", descricao: "Seis tiros entre você e o problema. O melhor amigo que dinheiro compra." },
  { id: "fuzil", nome: "Fuzil", categoria: "armas", preco: 40, espaco: 3, suporte: "bandoleira", nota: "Dano 3V · carga 5", descricao: "Pra conversar com quem está longe demais pra ouvir bom dia." },
  { id: "espingarda", nome: "Espingarda", categoria: "armas", preco: 40, espaco: 2, suporte: "bandoleira", nota: "1V longe / 2V perto · carga 2", descricao: "De perto ninguém discute com ela. Nem tenta." },
  { id: "garrucha", nome: "Garrucha", categoria: "armas", preco: 20, espaco: 1, suporte: "coldre", nota: "2V só de perto · carga 1", descricao: "Um tiro só — então faça valer, e faça de perto." },
  { id: "zarabatana", nome: "Zarabatana", categoria: "armas", preco: 10, espaco: 1, nota: "1D + veneno", descricao: "Silenciosa como um mau pensamento. O veneno vende o boticário." },
  { id: "estilingue", nome: "Estilingue", categoria: "armas", preco: 5, espaco: 1, nota: "2D", descricao: "Brinquedo de menino? Pergunte pro último que levou uma pedrada na testa." },
  { id: "boleadeira", nome: "Boleadeira", categoria: "armas", preco: 1, espaco: 1, nota: "3D", descricao: "Três pedras e uma corda. Derruba boi, cavalo e sujeito corredor." },
  { id: "arco-e-flecha", nome: "Arco e flecha", categoria: "armas", preco: 25, espaco: 1, nota: "1V", descricao: "Mais velho que a pólvora e não denuncia sua posição." },
  { id: "faca", nome: "Faca", categoria: "armas", preco: 5, espaco: 0.5, suporte: "bainha", nota: "3D · 1 faca vai fora do limite de armas prontas", descricao: "Corta corda, carne e conversa fiada. Ninguém sai de casa sem uma." },
  { id: "sabre", nome: "Sabre / espada", categoria: "armas", preco: 25, espaco: 1, suporte: "bainha", nota: "1V", descricao: "Sobra da guerra, afiada de novo. Elegante até na hora feia." },
  { id: "lanca", nome: "Lança", categoria: "armas", preco: 25, espaco: null, nota: "1V · espaço não especificado no livro", descricao: "Alcance é vida. O bicho — ou o sujeito — nem chega perto." },
  { id: "machadinha", nome: "Machadinha", categoria: "armas", preco: 10, espaco: 1, nota: "1V", descricao: "Leve na mão, boa de arremesso e melhor ainda de manhã na lenha." },
  { id: "machado-de-lenha", nome: "Machado de lenha", categoria: "armas", preco: 2, espaco: 2, nota: "2V", descricao: "Feito pra tora de aroeira. Serve pra outras coisas, mas eu não vi nada." },
  { id: "martelo-de-mao", nome: "Martelo de mão", categoria: "armas", preco: 10, espaco: 1, nota: "1V", descricao: "Prega cerca, conserta roda e resolve desavença. Ferramenta completa." },
  // ── Armas especiais vendáveis (pp. 58–59) ──
  { id: "pistola-automatica", nome: "Pistola automática", categoria: "armas", preco: 2000, espaco: 1, suporte: "coldre", nota: "1V · carga 11 · um tiro extra por ação", descricao: "Onze tiros sem recarregar. O futuro chegou — e custa os olhos da cara." },
  { id: "magnum", nome: "Magnum de cano alongado", categoria: "armas", preco: 4000, espaco: 1, suporte: "coldre", nota: "2V · carga 6", descricao: "Coice de mula, voz de trovão. Só empunha quem aguenta." },
  { id: "mauser-c69", nome: "Mauser C69", categoria: "armas", preco: 4000, espaco: 1, suporte: "coldre", nota: "1V · carga 15", descricao: "Engenharia do Estrangeiro: quinze tiros e recarga num piscar." },
  { id: "carabina", nome: "Carabina de repetição", categoria: "armas", preco: 2000, espaco: 2, suporte: "bandoleira", nota: "2V · carga 7", descricao: "Alavanca macia, sete no tubo. A queridinha dos cobradores de estrada." },
  { id: "derringer", nome: "Derringer", categoria: "armas", preco: 300, espaco: 1, suporte: "coldre", nota: "1V · ocultável, combina com Ataque Sacana", descricao: "Cabe na manga, na bota, na bíblia. Ninguém espera — e é essa a graça." },
  { id: "cano-serrado", nome: "Espingarda de cano serrado", categoria: "armas", preco: 150, espaco: 2, suporte: "coldre", nota: "3V · usa uma mão, cabe no coldre", descricao: "Serrada por especialista, juro. Espalha chumbo e encerra assunto." },
  { id: "dinamite", nome: "Explosivo TNT / dinamite", categoria: "armas", preco: 40, espaco: 0.5, nota: "5V em área de 1,5m", descricao: "Manuseie com carinho e acenda longe de mim. Sem devolução." },
  // ── Munição e suportes (p. 56) ──
  { id: "coldre", nome: "Coldre", categoria: "municao", preco: 15, espaco: null, nota: "Porta 1 revólver e até 36 balas", descricao: "Couro curtido no capricho. Saque limpo é meio caminho pra velhice." },
  { id: "bandoleira", nome: "Bandoleira", categoria: "municao", preco: 20, espaco: null, nota: "Porta 1 fuzil/espingarda e 24 balas · máx. 2", descricao: "Atravessada no peito, arma longa sempre à mão. Estilo é consequência." },
  { id: "bainha", nome: "Bainha", categoria: "municao", preco: 10, espaco: null, nota: "Porta faca, espada ou lâmina equivalente", descricao: "Lâmina solta corta a bolsa e a perna. Guarde a sua como gente." },
  { id: "balas-revolver", nome: "Caixa de 12 balas de revólver", categoria: "municao", preco: 8, espaco: 1, descricao: "Doze motivos pra continuar respirando. Conte antes de sair." },
  { id: "balas-espingarda", nome: "Caixa de 6 balas de espingarda", categoria: "municao", preco: 10, espaco: 1, descricao: "Cartuchos gordos de chumbo grosso. Meia dúzia bem empregada." },
  { id: "balas-fuzil", nome: "Caixa de 6 balas de fuzil", categoria: "municao", preco: 12, espaco: 1, descricao: "Comprida, encamisada, viaja léguas. Trate cada uma pelo nome." },
  // ── Proteções improvisadas (pp. 59–60) — vestidas; não aumentam Defesa ──
  { id: "sobretudo-protetor", nome: "Sobretudo protetor", categoria: "protecoes", preco: 70, espaco: null, vestivel: true, nota: "Reduz 1V por dano (limite 2V) · −1 Ação", descricao: "Forro de couro duplo costurado por dentro. Pesa, mas já me devolveram dois agradecendo." },
  { id: "colete-couro", nome: "Colete de couro reforçado", categoria: "protecoes", preco: 200, espaco: null, vestivel: true, nota: "Reduz 1V (limite 3V) · −1 Movimento", descricao: "Couro de boi velho, o mais teimoso. Segura faca e desacelera bala." },
  { id: "colete-madeira", nome: "Colete de couro com madeira", categoria: "protecoes", preco: 250, espaco: null, vestivel: true, nota: "Reduz 2V (limite 4V) · −1 Ação e −1 Mov.", descricao: "Ripas de aroeira entre duas capas de couro. Rústico, feio e funciona." },
  { id: "ombreiras", nome: "Ombreiras de ferro", categoria: "protecoes", preco: 500, espaco: null, vestivel: true, nota: "Reduz 2V (limite 4V) · −2 Movimentos", descricao: "Forjadas pra cavalaria da guerra. Você vira uma parede lenta." },
  { id: "placas-metal", nome: "Placas de metal", categoria: "protecoes", preco: 400, espaco: null, vestivel: true, nota: "Reduz 3V (limite 5V) · −2 Mov. e −1 Ação", descricao: "Chapas de fundição penduradas no peito. Deselegante como um cofre ambulante." },
  { id: "panelas-chumbadas", nome: "Panelas chumbadas", categoria: "protecoes", preco: 400, espaco: null, vestivel: true, nota: "Reduz 3V (limite 4V) · −1 Mov. e −2 Ações", descricao: "Ideia de mineiro desesperado que deu certo. Ridículo até parar a primeira bala." },
  // ── Animais e transporte (p. 55) ──
  { id: "cavalo", nome: "Cavalo", categoria: "animais", preco: 250, espaco: null, nota: "Vira sua montaria — configure na próxima etapa", descricao: "O melhor do meu estábulo. Olha esse peito, essa perna — isso é sociedade, não é compra." },
  { id: "mula", nome: "Mula / burrico", categoria: "animais", preco: 100, espaco: null, nota: "Vira sua montaria — configure na próxima etapa", descricao: "Teimosa, sim. Mas nunca vi mula desistir de subida nem de dono." },
  { id: "sela", nome: "Sela", categoria: "animais", preco: 10, espaco: null, descricao: "Couro macio, arção firme. Suas costas agradecem na terceira légua." },
  { id: "bolsa-montaria", nome: "Bolsa de montaria", categoria: "animais", preco: 10, espaco: null, nota: "Espaços extras no animal", descricao: "Alforje duplo de lona e couro. O bicho carrega o que você não aguenta." },
  { id: "carroca", nome: "Carroça", categoria: "animais", preco: 30, espaco: null, nota: "30 espaços de carga", descricao: "Roda nova, eixo untado. Leva mudança, mercadoria ou má companhia." },
  { id: "carro", nome: "Carro de tração animal", categoria: "animais", preco: 25, espaco: null, nota: "20 espaços de carga", descricao: "Mais leve que a carroça, mais charmoso também. Bom pra estrada batida." },
  { id: "canoa", nome: "Canoa", categoria: "animais", preco: 50, espaco: null, descricao: "Um pau só, cavado a enxó. O rio é a única estrada sem pedágio." },
  { id: "bovino", nome: "Bovino", categoria: "animais", preco: 300, espaco: null, descricao: "Começo de rebanho ou churrasco de um ano. Você decide o destino dele." },
  { id: "bode", nome: "Bode / cabra", categoria: "animais", preco: 100, espaco: null, descricao: "Come de tudo, sobrevive a tudo. Parecido com o povo daqui." },
  { id: "suino", nome: "Suíno", categoria: "animais", preco: 30, espaco: null, descricao: "Investimento de quintal: engorda rápido e não sobra nada." },
  { id: "ovelha", nome: "Ovelha / cordeiro", categoria: "animais", preco: 5, espaco: null, descricao: "Lã no frio, cria na primavera. Mansa que dá até dó." },
  { id: "galinhas", nome: "Galinhas", categoria: "animais", preco: 3, espaco: null, descricao: "Ovo fresco toda manhã e alarme contra raposa de graça." },
  { id: "apicultura", nome: "Apicultura", categoria: "animais", preco: 10, espaco: null, descricao: "Caixa, véu e enxame. Mel é ouro que não atrai bandido — quase." },
  { id: "curral", nome: "Curral (diária)", categoria: "animais", preco: 2, espaco: null, nota: "Cuidados, banho e alimentação", descricao: "Trato completo: feno, escova e banho. Seu bicho dorme melhor que você." },
  // ── Vestuário e adornos (p. 62) — vestida não ocupa; guardada 0,5 ──
  { id: "chapeu", nome: "Chapéu", categoria: "vestuario", preco: 100, espaco: 0.5, vestivel: true, descricao: "Feltro de primeira, aba no ponto. Um homem é o chapéu que carrega." },
  { id: "sombrero", nome: "Sombrero", categoria: "vestuario", preco: 20, espaco: 0.5, vestivel: true, descricao: "Sombra portátil pro sol do Mucuri. Cabe uma sesta inteira debaixo dele." },
  { id: "boina", nome: "Boina", categoria: "vestuario", preco: 1, espaco: 0.5, vestivel: true, descricao: "Discreta e barata. Cabeça quente pensa melhor, dizem." },
  { id: "cartola", nome: "Cartola", categoria: "vestuario", preco: 20, espaco: 0.5, vestivel: true, descricao: "Pra teatro, casamento ou enterro de gente importante. O seu, quem sabe." },
  { id: "camisa", nome: "Camisa", categoria: "vestuario", preco: 5, espaco: 0.5, vestivel: true, descricao: "Algodão honesto, costura reforçada. Aguenta suor e remendo." },
  { id: "blusa-verao", nome: "Blusa de verão", categoria: "vestuario", preco: 5, espaco: 0.5, vestivel: true, descricao: "Tecido fresco pro calor do sertão. Leve como fofoca." },
  { id: "blusa-inverno", nome: "Blusa de inverno", categoria: "vestuario", preco: 30, espaco: 0.5, vestivel: true, descricao: "Lã grossa de Maria da Fé. O frio de lá não perdoa turista." },
  { id: "calca", nome: "Calça", categoria: "vestuario", preco: 8, espaco: 0.5, vestivel: true, descricao: "Brim que aguenta sela, espinho e joelho no chão." },
  { id: "saia", nome: "Saia", categoria: "vestuario", preco: 15, espaco: 0.5, vestivel: true, descricao: "Roda bonito no baile e não atrapalha na montaria." },
  { id: "vestido", nome: "Vestido (trabalho a gala)", categoria: "vestuario", preco: 150, espaco: 0.5, vestivel: true, descricao: "Do algodão de lida à seda de gala. Diga a ocasião que eu digo o preço." },
  { id: "macacao", nome: "Macacão jeans", categoria: "vestuario", preco: 3, espaco: 0.5, vestivel: true, descricao: "Uniforme de quem trabalha de verdade. Bolso pra cada ferramenta." },
  { id: "colete-v", nome: "Colete", categoria: "vestuario", preco: 15, espaco: 0.5, vestivel: true, descricao: "Segura o relógio, o baralho e a pose. Indispensável no carteado." },
  { id: "paleto", nome: "Paletó", categoria: "vestuario", preco: 50, espaco: 0.5, vestivel: true, descricao: "Corte de cidade grande. Abre porta de banco e de salão." },
  { id: "tuxedo", nome: "Tuxedo", categoria: "vestuario", preco: 50, espaco: 0.5, vestivel: true, descricao: "Rigor do Estrangeiro. Vista-o e até o xerife te chama de doutor." },
  { id: "casaco", nome: "Casaco", categoria: "vestuario", preco: 15, espaco: 0.5, vestivel: true, descricao: "Contra a friagem da madrugada e o vento da estrada." },
  { id: "jaqueta", nome: "Jaqueta", categoria: "vestuario", preco: 300, espaco: 0.5, vestivel: true, descricao: "Couro lavrado, botões de prata. Peça de vaidade — e que vaidade." },
  { id: "sobretudo-v", nome: "Sobretudo (vestuário)", categoria: "vestuario", preco: 200, espaco: 0.5, vestivel: true, nota: "Não é o sobretudo protetor", descricao: "Comprido até a bota, dramático no vento. Entrada garantida em qualquer história." },
  { id: "poncho", nome: "Poncho", categoria: "vestuario", preco: 50, espaco: 0.5, vestivel: true, descricao: "Cobertor, capa e travesseiro. O melhor amigo do viajante." },
  { id: "batina", nome: "Batina", categoria: "vestuario", preco: 2, espaco: 0.5, vestivel: true, descricao: "Preta, sóbria, respeitada. Abre porta que bala não abre." },
  { id: "camisola", nome: "Camisola", categoria: "vestuario", preco: 25, espaco: 0.5, vestivel: true, descricao: "Linho macio pra noite. Até fora-da-lei merece dormir direito." },
  { id: "pijamas", nome: "Pijamas", categoria: "vestuario", preco: 30, espaco: 0.5, vestivel: true, descricao: "Moda nova que veio de navio. Dormir vestido de gente rica." },
  { id: "ceroulas", nome: "Ceroulas", categoria: "vestuario", preco: 2, espaco: 0.5, vestivel: true, descricao: "Ninguém vê, todo mundo precisa. Leve duas." },
  { id: "lingerie", nome: "Lingerie", categoria: "vestuario", preco: 100, espaco: 0.5, vestivel: true, descricao: "Renda fina do Estrangeiro. Embrulho discreto, palavra de honra." },
  { id: "meias", nome: "Meias", categoria: "vestuario", preco: 0.25, espaco: 0.5, vestivel: true, descricao: "Pé seco é soldado feliz. O item mais subestimado da loja." },
  { id: "botas", nome: "Botas", categoria: "vestuario", preco: 10, espaco: 0.5, vestivel: true, descricao: "Sola dupla, cano alto. Entre você e a cobra, elas." },
  { id: "sapatos", nome: "Sapatos", categoria: "vestuario", preco: 100, espaco: 0.5, vestivel: true, descricao: "Verniz de baile. Não pise na lama com isso, pelo amor." },
  { id: "perneiras", nome: "Perneiras", categoria: "vestuario", preco: 15, espaco: 0.5, vestivel: true, descricao: "Couro contra espinho, mato e coice. Vaqueiro de verdade não sai sem." },
  { id: "cinto", nome: "Cinto", categoria: "vestuario", preco: 5, espaco: 0.5, vestivel: true, descricao: "Fivela de latão que segura a calça e a compostura." },
  { id: "suspensorios", nome: "Suspensórios", categoria: "vestuario", preco: 5, espaco: 0.5, vestivel: true, descricao: "Pra quem confia mais em ombro que em cintura." },
  { id: "luvas", nome: "Luvas", categoria: "vestuario", preco: 1, espaco: 0.5, vestivel: true, descricao: "Pelica macia. Protege a mão e esconde o calo — ou a falta dele." },
  { id: "lenco-pescoco", nome: "Lenço de pescoço", categoria: "vestuario", preco: 1, espaco: 0.5, vestivel: true, descricao: "Contra a poeira; sobe pro rosto quando a intenção pede." },
  { id: "echarpe", nome: "Echarpe", categoria: "vestuario", preco: 2, espaco: 0.5, vestivel: true, descricao: "Um toque de cidade grande no meio do sertão." },
  { id: "xale", nome: "Xale de lã", categoria: "vestuario", preco: 2, espaco: 0.5, vestivel: true, descricao: "Tecido por avó de verdade. Aquece corpo e saudade." },
  { id: "gravata", nome: "Gravata", categoria: "vestuario", preco: 5, espaco: 0.5, vestivel: true, descricao: "Nó bem dado impressiona juiz, banqueiro e sogra." },
  { id: "oculos-v", nome: "Óculos", categoria: "vestuario", preco: 25, espaco: 0.5, vestivel: true, descricao: "Lentes lapidadas. O mundo fica nítido — nem sempre é vantagem." },
  { id: "anel", nome: "Anel (latão a diamante)", categoria: "vestuario", preco: 1500, espaco: null, descricao: "Do latão de feira ao diamante de pedido. Diga a intenção." },
  { id: "brincos", nome: "Brincos (latão a diamantes)", categoria: "vestuario", preco: 1500, espaco: null, descricao: "Brilho na orelha pra quem gosta de ser notada. Ou notado." },
  { id: "colar", nome: "Colar (ferro a pérolas)", categoria: "vestuario", preco: 2500, espaco: null, descricao: "De elo de ferro a pérola do litoral de Santo Ozório." },
  { id: "pulseira", nome: "Pulseira (lata a diamante)", categoria: "vestuario", preco: 2000, espaco: null, descricao: "Tilinta no pulso anunciando que a vida vai bem." },
  { id: "broche", nome: "Broche (latão a prata)", categoria: "vestuario", preco: 500, espaco: null, descricao: "Prende o xale e conta história. Herança de alguém, sempre." },
  { id: "gargantilha", nome: "Gargantilha", categoria: "vestuario", preco: 1, espaco: null, descricao: "Fita de veludo justa no pescoço. Simples que encanta." },
  { id: "bolsa-de-mao", nome: "Bolsa de mão", categoria: "vestuario", preco: 20, espaco: 0.5, descricao: "Couro fino com fecho de metal. Cabe um segredo e uma derringer." },
  { id: "leque", nome: "Leque", categoria: "vestuario", preco: 3, espaco: null, descricao: "Abana o calor e esconde o sorriso. Arma social completa." },
  { id: "bengala", nome: "Bengala", categoria: "vestuario", preco: 2, espaco: null, descricao: "Apoio pro passo e pompa pro porte. Castão de metal." },
  { id: "avental-medico", nome: "Avental de médico", categoria: "vestuario", preco: 5, espaco: 0.5, vestivel: true, descricao: "Branco enquanto dura. Inspira confiança em quem sangra." },
  { id: "estetoscopio", nome: "Estetoscópio", categoria: "vestuario", preco: 50, espaco: null, descricao: "Escuta coração, pulmão e cofre — depende do dono." },
  // ── Mercearia (p. 61) ──
  { id: "mochila", nome: "Mochila", categoria: "mercearia", preco: 1, espaco: null, nota: "10 espaços — a base do inventário", descricao: "Lona dupla e alça costurada. A casa de quem não tem casa." },
  { id: "carne-seca", nome: "Carne seca (1 kg)", categoria: "mercearia", preco: 2, espaco: 1, descricao: "Salgada no ponto, dura meses. O rango oficial da estrada." },
  { id: "feijao", nome: "Feijão (lata)", categoria: "mercearia", preco: 2, espaco: 1, descricao: "Fogueira, panela e paciência. Cheiro de acampamento feliz." },
  { id: "farinha", nome: "Farinha (0,5 kg)", categoria: "mercearia", preco: 2, espaco: 0.5, descricao: "Engrossa o caldo e enche o bucho. Não viaje sem." },
  { id: "acucar", nome: "Açúcar (0,5 kg)", categoria: "mercearia", preco: 2, espaco: 0.5, descricao: "Doçura pesada na balança. O café agradece." },
  { id: "cafe", nome: "Café (lata)", categoria: "mercearia", preco: 1, espaco: null, descricao: "Torrado na hora. Sem ele ninguém madruga nem vigia." },
  { id: "queijo", nome: "Queijo (0,5 kg)", categoria: "mercearia", preco: 6, espaco: 0.5, descricao: "Curado na prateleira escura. Orgulho da casa, prove." },
  { id: "ovos", nome: "Ovos (6)", categoria: "mercearia", preco: 2.5, espaco: 0.5, descricao: "Frescos da manhã. Embrulho em palha, mas o pulo é seu." },
  { id: "leite", nome: "Leite (0,5 L)", categoria: "mercearia", preco: 5, espaco: 1, descricao: "Tirado hoje. Beba logo que o sertão não tem gelo." },
  { id: "pao-de-queijo", nome: "Pão de queijo (10)", categoria: "mercearia", preco: 2, espaco: 0.5, descricao: "Receita de Minas das antigas. Quentinho amansa até jagunço." },
  { id: "biscoitos", nome: "Biscoitos", categoria: "mercearia", preco: 1, espaco: null, descricao: "De polvilho, sequinhos. A lata some antes da viagem começar." },
  { id: "maras", nome: "Maçãs (3)", categoria: "mercearia", preco: 0.1, espaco: null, descricao: "Vermelhas da serra. Uma pra você, uma pro cavalo, uma pra sorte." },
  { id: "cenouras", nome: "Cenouras (5)", categoria: "mercearia", preco: 0.25, espaco: 1, descricao: "Doces da horta. Cavalo trabalha melhor subornado." },
  { id: "milho", nome: "Milho (lata)", categoria: "mercearia", preco: 0.5, espaco: 0.5, descricao: "Da roça pra lata. Cozinha rápido em noite cansada." },
  { id: "ervilhas", nome: "Ervilhas (lata)", categoria: "mercearia", preco: 15, espaco: 0.5, descricao: "Finas, do Estrangeiro. Luxo verde em lata — por isso o preço." },
  { id: "atum", nome: "Atum (lata)", categoria: "mercearia", preco: 0.5, espaco: 0.5, descricao: "Mar em conserva pra quem mora longe dele." },
  { id: "sardinha", nome: "Sardinha (lata)", categoria: "mercearia", preco: 0.25, espaco: 0.5, descricao: "Abre com faca e janta com dignidade. Quase." },
  { id: "sopa", nome: "Sopa", categoria: "mercearia", preco: 2, espaco: 0.5, descricao: "Desidratada: é só ferver água e fingir que é da vovó." },
  { id: "azeite", nome: "Azeite (garrafa)", categoria: "mercearia", preco: 2, espaco: 1, descricao: "Dourado, importado. Três gotas e o feijão vira banquete." },
  { id: "folhas-cha", nome: "Folhas de chá (0,5 kg)", categoria: "mercearia", preco: 2, espaco: 1, descricao: "Acalma o nervo e a insônia. Costume fino do Oriente." },
  { id: "chocolate", nome: "Chocolate (barra)", categoria: "mercearia", preco: 4, espaco: null, descricao: "Raro por aqui. Esconda do calor e dos amigos." },
  { id: "alcacuz", nome: "Alcaçuz (doces)", categoria: "mercearia", preco: 1, espaco: null, descricao: "Docinho de raiz que as crianças pedem pelo nome." },
  { id: "erva-medicinal", nome: "Erva medicinal (0,5 kg)", categoria: "mercearia", preco: 50, espaco: 0.5, descricao: "Colhida na lua certa, seca na sombra. O doutor sabe o resto." },
  { id: "cerveja", nome: "Cerveja (garrafa)", categoria: "mercearia", preco: 1, espaco: 1, descricao: "Morna, mas honesta. Melhor que a água de certos poços." },
  { id: "pinga", nome: "Pinga (garrafa)", categoria: "mercearia", preco: 1, espaco: 1, descricao: "Da boa, do alambique do vale. Cura frio, medo e timidez." },
  { id: "vinho", nome: "Vinho (garrafa)", categoria: "mercearia", preco: 10, espaco: 1, descricao: "Tinto guardado pra ocasião. Toda garrafa acha a sua." },
  { id: "uisque", nome: "Uísque (garrafa)", categoria: "mercearia", preco: 10, espaco: 1, descricao: "Do jeito que os pistoleiros pedem nos livros. Arde certo." },
  { id: "conhaque", nome: "Conhaque fino (garrafa)", categoria: "mercearia", preco: 60, espaco: 0.5, descricao: "Veio de navio, dormiu em barril. Bebida de fechar negócio." },
  { id: "tabaco", nome: "Tabaco (0,5 kg)", categoria: "mercearia", preco: 5, espaco: 0.5, descricao: "Folha escura, corte grosso. Enrole com calma, fume com menos." },
  { id: "paierinhos", nome: "Paierinhos (5)", categoria: "mercearia", preco: 1, espaco: null, descricao: "Palha pronta pra quem não tem paciência de enrolar." },
  { id: "fosforos-mercearia", nome: "Fósforos (10)", categoria: "mercearia", preco: 0.1, espaco: null, descricao: "Dez chances de fogo. Guarde seco ou chore molhado." },
  { id: "oleo-lanterna", nome: "Óleo de lanterna", categoria: "mercearia", preco: 0.5, espaco: 0.5, descricao: "Queima limpo a noite inteira. A escuridão que espere." },
  { id: "jornal", nome: "Jornal", categoria: "mercearia", preco: 0.25, espaco: null, descricao: "Notícia de quinze dias atrás — novinha pra quem não sabia." },
  { id: "sabao-mercearia", nome: "Sabão (barra)", categoria: "mercearia", preco: 0.25, espaco: 0.5, descricao: "Esfrega que sai: lama, sangue e mau juízo." },
  { id: "tabua-lavar", nome: "Tábua de lavar", categoria: "mercearia", preco: 3, espaco: 1, descricao: "Ondulada no capricho. Roupa limpa, braço forte." },
  { id: "martelo-mercearia", nome: "Martelo (mercearia)", categoria: "mercearia", preco: 1, espaco: 1, descricao: "Martelinho de casa pra prego de quadro. Não espere milagre." },
  { id: "tonico-capilar", nome: "Tônico capilar (frasco)", categoria: "mercearia", preco: 15, espaco: 0.5, descricao: "Promete juba de leão. O careca do rótulo não é o dono, juro." },
  { id: "unguento-mercearia", nome: "Unguento (frasco)", categoria: "mercearia", preco: 10, espaco: 1, descricao: "Passa que alivia — dor de sela, de sol e de arrependimento." },
  // ── Armazém (p. 63) ──
  { id: "cantil", nome: "Cantil", categoria: "armazem", preco: 5, espaco: null, descricao: "Água é a diferença entre viajante e esqueleto. Leve dois." },
  { id: "corda", nome: "Corda (5 m)", categoria: "armazem", preco: 5, espaco: 1, descricao: "Amarra, laça, escala e pendura. Cinco metros de solução." },
  { id: "barraca", nome: "Barraca", categoria: "armazem", preco: 12, espaco: 1, descricao: "Lona dupla contra chuva de Bom Fim. Monta em dez minutos, xingando." },
  { id: "saco-dormir", nome: "Saco de dormir", categoria: "armazem", preco: 0.5, espaco: 1, descricao: "Forrado de lã. O chão continua duro, mas menos." },
  { id: "lanterna", nome: "Lanterna", categoria: "armazem", preco: 10, espaco: 1, descricao: "Vidro e latão, chama protegida. O escuro do sertão respeita." },
  { id: "bussola", nome: "Bússola", categoria: "armazem", preco: 5, espaco: null, descricao: "O norte dela não falha — diferente do seu senso de direção." },
  { id: "binoculo", nome: "Binóculo", categoria: "armazem", preco: 40, espaco: 0.5, descricao: "Enxergue a encrenca antes que ela te enxergue." },
  { id: "relogio-bolso", nome: "Relógio de bolso", categoria: "armazem", preco: 50, espaco: 0.5, descricao: "Corda diária, pontualidade eterna. Com corrente e pose." },
  { id: "isqueiro", nome: "Isqueiro", categoria: "armazem", preco: 30, espaco: null, descricao: "Pederneira mecânica de bolso. Fogo no polegar, chique assim." },
  { id: "pederneira", nome: "Pederneira", categoria: "armazem", preco: 1, espaco: 0.5, descricao: "Pedra e aço, método dos avós. Nunca descarrega." },
  { id: "fosforos-armazem", nome: "Fósforos", categoria: "armazem", preco: 0.1, espaco: null, descricao: "Caixinha de emergência. Esconda uma na bota." },
  { id: "panela", nome: "Panela", categoria: "armazem", preco: 10, espaco: 1, descricao: "Ferro fundido pesado. Cozinha, assa e — dizem — apara bala." },
  { id: "graxa", nome: "Graxa (pote)", categoria: "armazem", preco: 2, espaco: 0.5, descricao: "Pra bota, sela e eixo. Range, passou; rangeu, passa." },
  { id: "linha-agulha", nome: "Linha e agulha", categoria: "armazem", preco: 1, espaco: null, descricao: "Remenda camisa, lona e — se o doutor faltar — gente." },
  { id: "baralho", nome: "Baralho", categoria: "armazem", preco: 2, espaco: null, descricao: "Cinquenta e duas cartas, mil confusões. Novo, sem marca. Confie." },
  { id: "dados", nome: "Dados (3)", categoria: "armazem", preco: 1, espaco: null, descricao: "Osso torneado, honestos até onde sei. A sorte é problema seu." },
  { id: "gazuas", nome: "Gazuas (20)", categoria: "armazem", preco: 1, espaco: 1, descricao: "Ferramentas de... serralheiro. Vinte, pras fechaduras teimosas." },
  { id: "algemas", nome: "Algemas", categoria: "armazem", preco: 4, espaco: 0.5, descricao: "Aço duplo com chave. Pra entregar encomenda que espernia." },
  { id: "cadeado", nome: "Cadeado", categoria: "armazem", preco: 1, espaco: 0.5, descricao: "Não para ladrão bom, mas desanima o preguiçoso." },
  { id: "corrente", nome: "Corrente (2 m)", categoria: "armazem", preco: 25, espaco: 1, descricao: "Elo grosso, forjado. Segura portão, baú e prisioneiro." },
  { id: "arame", nome: "Arame (10 m)", categoria: "armazem", preco: 5, espaco: 2, descricao: "Dez metros de cerca ou de gambiarra. Cuidado com a farpa." },
  { id: "lona", nome: "Lona (2 m)", categoria: "armazem", preco: 30, espaco: 2, descricao: "Cobre carga, vira teto e embrulha o que não deve ser visto." },
  { id: "pavio", nome: "Pavio (10 m)", categoria: "armazem", preco: 15, espaco: 2, descricao: "Queima parelho, no tempo certo. Meça duas vezes, corra uma." },
  { id: "detonador", nome: "Detonador", categoria: "armazem", preco: 5, espaco: 1, descricao: "Êmbolo e fio pra quem respeita a própria mão." },
  { id: "pe-de-cabra", nome: "Pé de cabra", categoria: "armazem", preco: 10, espaco: 1, descricao: "Abre caixote, porta e discussão. Alavanca de argumentos." },
  { id: "pa", nome: "Pá", categoria: "armazem", preco: 2, espaco: 1, descricao: "Cava horta, poço e o que a consciência pedir." },
  { id: "picareta", nome: "Picareta", categoria: "armazem", preco: 25, espaco: 2, descricao: "Ferro de mina, cabo de aroeira. A rocha cede primeiro." },
  { id: "machado-armazem", nome: "Machado (armazém)", categoria: "armazem", preco: 25, espaco: 1, descricao: "Fio tratado, equilíbrio bom. Lenha rachada em um golpe." },
  { id: "marreta", nome: "Marreta", categoria: "armazem", preco: 25, espaco: 1, descricao: "Quando o martelo pede ajuda. Sutileza não é o forte dela." },
  { id: "foice", nome: "Foice", categoria: "armazem", preco: 25, espaco: 1, descricao: "Lâmina curva pra capim alto e superstição alheia." },
  { id: "forcado", nome: "Forcado", categoria: "armazem", preco: 25, espaco: 1, descricao: "Vira feno de dia. De noite, já virou outras coisas." },
  { id: "alicate", nome: "Alicate de arame", categoria: "armazem", preco: 50, espaco: 1, descricao: "Corta cerca — a sua, de preferência. Aço temperado." },
  { id: "tesourao", nome: "Tesourão", categoria: "armazem", preco: 50, espaco: 2, descricao: "Tosquia ovelha e apara o que mais precisar de aparo." },
  { id: "pregos", nome: "Pregos (20)", categoria: "armazem", preco: 1, espaco: null, descricao: "Vinte unidades. Metade entorta, é da vida." },
  { id: "oleo-lata", nome: "Óleo (lata)", categoria: "armazem", preco: 2, espaco: 1, descricao: "Lubrifica dobradiça, arma e engrenagem enferrujada." },
  { id: "sabao-armazem", nome: "Sabão (armazém)", categoria: "armazem", preco: 0.5, espaco: null, descricao: "Barra parruda de lavar lona, cavalo e consciência." },
  { id: "oculos-armazem", nome: "Óculos (armazém)", categoria: "armazem", preco: 50, espaco: 0.5, descricao: "Proteção pra poeira e fagulha. Mineiro esperto usa." },
  { id: "brinquedo", nome: "Brinquedo", categoria: "armazem", preco: 20, espaco: 0.5, descricao: "Cavalinho de pau entalhado. Pra criança — ou pra saudade." },
  { id: "vara-pescar", nome: "Vara de pescar", categoria: "armazem", preco: 5, espaco: 1, descricao: "Bambu, linha e anzol. Janta grátis pra quem tem paciência." },
  { id: "violao", nome: "Violão", categoria: "armazem", preco: 60, espaco: 1, descricao: "Madeira que canta. Toda fogueira vira festa com um." },
  { id: "viola", nome: "Viola", categoria: "armazem", preco: 60, espaco: 1, descricao: "Dez cordas de moda antiga. Chora bonito nas mãos certas." },
  { id: "violino", nome: "Violino", categoria: "armazem", preco: 100, espaco: 1, descricao: "Fino, do Estrangeiro. Nos bailes, vale mais que revólver." },
  { id: "banjo", nome: "Banjo", categoria: "armazem", preco: 100, espaco: 1, descricao: "Alegria em forma de tambor com cordas. Impossível ficar parado." },
  { id: "gaita", nome: "Gaita / harmônica", categoria: "armazem", preco: 25, espaco: 1, descricao: "Cabe no bolso e leva a solidão embora. Trilha de estrada." },
  { id: "flauta", nome: "Flauta", categoria: "armazem", preco: 100, espaco: 1, descricao: "Sopro fino pra serenata e passarinho ciumento." },
  { id: "acordeao", nome: "Acordeão / sanfona", categoria: "armazem", preco: 50, espaco: 1, descricao: "O fole que comanda o forró. Pesa no lombo, paga em dança." },
  { id: "pandeiro", nome: "Pandeiro", categoria: "armazem", preco: 80, espaco: 1, descricao: "Couro esticado e platinela. Segura o ritmo da roda inteira." },
  { id: "tamborim", nome: "Tamborim", categoria: "armazem", preco: 20, espaco: 1, descricao: "Pequeno e atrevido. Marca o compasso na palma da mão." },
  { id: "zabumba", nome: "Zabumba", categoria: "armazem", preco: 50, espaco: 2, descricao: "O coração grave do baile. Ouve-se antes de se ver." },
  { id: "berimbau", nome: "Berimbau", categoria: "armazem", preco: 2, espaco: 1, descricao: "Arco, cabaça e aço. Um som só que conta mil histórias." },
  { id: "ganza", nome: "Ganzá / chocalho", categoria: "armazem", preco: 10, espaco: 1, descricao: "Chia no ritmo. Até quem não sabe tocar, toca." },
  // ── Farmácia (pp. 64–65) — 0,5 espaço por frasco ──
  { id: "unguento-pasta", nome: "Unguento (pasta)", categoria: "farmacia", preco: 10, espaco: 0.5, nota: "Cura 1V no descanso", descricao: "Fórmula da casa: arde, cheira mal e fecha ferida. Nessa ordem." },
  { id: "canfora", nome: "Cânfora (pasta)", categoria: "farmacia", preco: 30, espaco: 0.5, nota: "1 Ação em combate, cura 1V", descricao: "Passa no ferimento no meio do tiroteio e siga em frente." },
  { id: "adrenalina", nome: "Adrenalina (seringa)", categoria: "farmacia", preco: 500, espaco: 0.5, nota: "Recupera 3V; rebote de −1 Ação/−1 Mov.", descricao: "Levanta defunto por uma hora. A conta chega depois — sempre chega." },
  { id: "morfina", nome: "Morfina (ampola)", categoria: "farmacia", preco: 100, espaco: 0.5, descricao: "Silêncio químico pra dor grande. Receito com a mão pesada e o olho fechado." },
  { id: "tonico-milagroso", nome: "Tônico milagroso", categoria: "farmacia", preco: 50, espaco: 0.5, nota: "Carta preta cura 3V; vermelha envenena", descricao: "Do mascate que passou semana passada. Metade jura que funciona. A outra metade..." },
  { id: "pomada-cavalo", nome: "Pomada de cavalo", categoria: "farmacia", preco: 10, espaco: 0.5, nota: "Montaria recupera 3V no descanso", descricao: "Milagre veterinário. Tem gente que passa em gente — não recomendo, funciona." },
  { id: "alcool", nome: "Álcool (frasco)", categoria: "farmacia", preco: 5, espaco: 0.5, descricao: "Limpa ferida e instrumento. Beber é desperdício e burrice." },
  { id: "laxante", nome: "Laxante (frasco)", categoria: "farmacia", preco: 10, espaco: 0.5, descricao: "Eficaz demais. Dose pequena, distância grande da civilização." },
  { id: "xarope", nome: "Xarope de tosse", categoria: "farmacia", preco: 5, espaco: 0.5, descricao: "Mel, ervas e um segredo. A tosse passa ou desiste." },
  { id: "arsenico", nome: "Arsênico (frasco)", categoria: "farmacia", preco: 4, espaco: 0.5, descricao: "Pra ratos. Vendo pouco por vez e anoto quem levou, sem ofensa." },
  { id: "babosa", nome: "Babosa (erva)", categoria: "farmacia", preco: 2, espaco: 0.5, descricao: "Gosma bendita pra queimadura de sol e de fogueira." },
  { id: "boldo", nome: "Boldo (erva)", categoria: "farmacia", preco: 2, espaco: 0.5, descricao: "Amargo que conserta fígado arrependido de ontem." },
  { id: "cavalinha", nome: "Cavalinha (erva)", categoria: "farmacia", preco: 2, espaco: 0.5, descricao: "Chá diurético das avós. Rim novo em folha, dizem elas." },
  { id: "erva-doce", nome: "Erva-doce (erva)", categoria: "farmacia", preco: 2, espaco: 0.5, descricao: "Acalma estômago, nervo e criança que não dorme." },
  { id: "mil-folhas", nome: "Mil-folhas (erva)", categoria: "farmacia", preco: 2, espaco: 0.5, descricao: "Estanca sangue pequeno. Toda algibeira de tropeiro tem." },
  { id: "folha-salgueiro", nome: "Folha de salgueiro", categoria: "farmacia", preco: 3, espaco: 0.5, descricao: "Mastigue pra dor de cabeça. Ciência antiga que funciona." },
  { id: "gengibre", nome: "Gengibre (raiz)", categoria: "farmacia", preco: 2, espaco: 0.5, descricao: "Esquenta o peito e espanta enjoo de estrada e de barco." },
];

/** Preço com a economia da mesa, em centavos de réis. */
export function precoNaMesa(preco: number, multiplicador = 1): number {
  return Math.round(preco * multiplicador * 100) / 100;
}

export function itemById(id: string): ItemCatalogo | undefined {
  return CATALOGO.find((i) => i.id === id);
}

/** Ícone pintado do item — todos os 199 têm arte em public/story/itens. */
export function itemImagem(id: string): string {
  return `/story/itens/${id}.webp`;
}

/** Animais de montaria no alforje, um por unidade comprada (cavalos primeiro). */
export function montariasCompradas(itens: CompraItem[]): ("cavalo" | "mula")[] {
  const lista: ("cavalo" | "mula")[] = [];
  for (const id of ["cavalo", "mula"] as const) {
    const q = itens.find((i) => i.id === id)?.quantidade ?? 0;
    for (let k = 0; k < q; k++) lista.push(id);
  }
  return lista;
}

export interface ResumoCompras {
  custoTotal: number;
  saldo: number;
  /** Espaço a guardar na mochila após vestir roupas e portar armas. */
  espacoUsado: number;
  capacidade: number;
  armasProntas: number;
  limiteArmasProntas: number;
  temMontaria: boolean;
  avisos: string[];
}

const ORCAMENTO = 200;
const CAPACIDADE_MOCHILA = 10;
const CAPACIDADE_MONTARIA = 15;

/**
 * Resumo de custo e espaço (pp. 52–53):
 * roupas/proteções: 1ª unidade vestida (0 espaço), extras 0,5;
 * armas prontas em coldre/bandoleira/bainha compradas não ocupam mochila
 * (máx. 4 prontas + 1 faca fora do limite; máx. 2 bandoleiras);
 * o resto guarda na mochila (10) e na montaria comprada (15), se houver.
 */
export function resumoCompras(
  itens: CompraItem[],
  orcamento: number = ORCAMENTO,
  /** Economia da mesa (regra de mesa): multiplica o preço de tabela. */
  multiplicador = 1,
): ResumoCompras {
  let custoTotal = 0;
  let espaco = 0;
  const avisos: string[] = [];
  const nMontarias = montariasCompradas(itens).length;
  const temMontaria = nMontarias > 0;

  const qty = (id: string) => itens.find((i) => i.id === id)?.quantidade ?? 0;
  const suportes: Record<SuporteArma, number> = {
    coldre: qty("coldre"),
    bandoleira: Math.min(2, qty("bandoleira")),
    bainha: qty("bainha"),
  };
  if (qty("bandoleira") > 2) avisos.push("Máximo de 2 bandoleiras equipadas — as extras vão para a mochila.");

  let armasProntas = 0;
  let facaLivreUsada = false;
  const LIMITE_PRONTAS = 4;

  for (const { id, quantidade } of itens) {
    const item = itemById(id);
    if (!item || quantidade <= 0) continue;
    custoTotal += precoNaMesa(item.preco, multiplicador) * quantidade;

    let guardadas = quantidade;
    if (item.vestivel) {
      guardadas = Math.max(0, quantidade - 1); // 1ª vestida
    } else if (item.suporte) {
      for (let u = 0; u < quantidade; u++) {
        if (item.id === "faca" && !facaLivreUsada) {
          facaLivreUsada = true; // 1 faca fora do limite (p. 53)
          guardadas--;
        } else if (suportes[item.suporte] > 0 && armasProntas < LIMITE_PRONTAS) {
          suportes[item.suporte]--;
          armasProntas++;
          guardadas--;
        }
      }
    }
    espaco += (item.espaco ?? 0) * guardadas;
  }

  const capacidade = CAPACIDADE_MOCHILA + CAPACIDADE_MONTARIA * nMontarias;
  custoTotal = Math.round(custoTotal * 100) / 100;
  return {
    custoTotal,
    saldo: Math.round((orcamento - custoTotal) * 100) / 100,
    espacoUsado: espaco,
    capacidade,
    armasProntas: armasProntas + (facaLivreUsada ? 1 : 0),
    limiteArmasProntas: LIMITE_PRONTAS + 1,
    temMontaria,
    avisos,
  };
}
