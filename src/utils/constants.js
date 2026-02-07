// src/utils/constants.js

export const STATE_NAMES = {
    'MG': 'Minas Gerais',
    'SP': 'São Paulo',
    'RJ': 'Rio de Janeiro',
    'ES': 'Espírito Santo',
    'BA': 'Bahia',
    'SC': 'Santa Catarina',
    'PR': 'Paraná',
    'RS': 'Rio Grande do Sul',
    'GO': 'Goiás',
    'DF': 'Distrito Federal'
};

// Lista oficial de Comodidades para comparar e exibir
export const AMENITIES_LIST = [
    "Piscina adulto", "Piscina infantil", "Piscina aquecida", "Cachoeira / Riacho", "Cascata/Cachoeira artificial",
    "Acesso à represa / lago", "Bicicletas", "Quadriciclo", "Passeio a cavalo", "Caiaque / Stand up",
    "Trilha", "Pesque e solte", "Fazendinha / Animais", "Espaço kids", "Recreação infantil",
    "Quadra de areia", "Campo de futebol", "Campo de vôlei e peteca", "Beach tennis / futvôlei",
    "Academia", "Sauna mista a vapor", "Hidromassagem / Banheira / Ofurô", "Massagem",
    "Espaço para meditação", "Capela", "Redes", "Vista / Mirante", "Fogo de chão / Lareira",
    "Churrasqueira", "Cozinha equipada", "Bar / Restaurante / Quiosque", "Sala de jogos", "Música ao vivo", 
    "Estacionamento", "Wi-Fi", "Piscina climatizada", "Playground", "Área verde", "Lagoa com água da nascente", 
    "Piscina com água da nascente", "Pratos e talheres", "Tomadas disponíveis", "Pia com torneira", "Tirolesa infantil",
    "Tirolesa Adulto", "Gangorra", "Cachoeira com túnel",  "Parque aquático adulto", "Piscina coberta", "Sauna masculina a vapor",
    "Sauna feminina a vapor", "Vara de pesca", "Iscas para pesca", "Banheiro com ducha quente","Lago", "Pesque e pague", "Balanço",
    "Ducha fria", "Banheiros com ducha", "Sinuca", "Espaço de leitura", "Quadra poliesportiva", "Piscina semiolímpica", 
    "Quadra de peteca e vôlei", "Barco a remo", "Pedalinho", "Bike park", "Escorrega de sabão", "Cama elástica infantil",
    "Vale jurássico", "Piscina de borda infinita", "Solarium", "Toboágua", "Acesso a acomodação", "Monitor infantil", "Passeio de charrete"
];

export const WEEK_DAYS = [
    'Domingo', 
    'Segunda-feira', 
    'Terça-feira', 
    'Quarta-feira', 
    'Quinta-feira', 
    'Sexta-feira', 
    'Sábado'
];

// Tipos de ingresso que consideramos "Adulto" para cálculo de menor preço
export const GUARDIAN_TYPES = [
    'adult', 
    'combo_adult', 
    'mix_ac', 
    'mix_suite', 
    'super_mix'
];

export const MEALS_LIST = [
  "Café da manhã", "Almoço", "Café da tarde", "Petiscos", "Sobremesas", "Bebidas NÃO Alcoólicas", "Bebidas Alcoólicas", "Buffet Livre"
];