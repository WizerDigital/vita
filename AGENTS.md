# Diretrizes para Modificações no Prompt do Agente

Este documento contém instruções fundamentais para a manutenção e evolução do prompt do sistema (`system_prompt.js`).

## Regra de Ouro: Modificações Pontuais e Seguras

Ao realizar qualquer alteração no prompt do agente, siga rigorosamente a instrução abaixo:

- **Escopo Restrito**: Modifique **apenas** o que for estritamente necessário para atender à solicitação do usuário.
- **Preservação de Contexto**: Evite reescrever ou remover seções do prompt que não foram mencionadas na tarefa atual.
- **Impacto Mínimo**: Garanta que as novas regras ou blocos adicionados não entrem em conflito com as capacidades existentes (como gestão financeira ou lembretes), a menos que a mudança seja explicitamente solicitada.
- **Integridade de Variáveis**: Nunca altere a lógica de interpolação de variáveis dinâmicas (ex: `${userName}`, `${expenseCategories}`) a menos que a estrutura de dados tenha mudado.

## Objetivos das Alterações

1. **Manter a Objetividade**: O agente deve ser direto e focado em ações.
2. **Evitar Redundância**: Não adicione instruções que já estão cobertas por outras seções.
3. **Clareza de Ferramentas**: Sempre mantenha o bloco de ferramentas atualizado com suas respectivas aplicações.
