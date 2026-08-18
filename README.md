# Traffic Pulse Dashboard

Vamos montar um dashboard em cima deste modelo gratuito: 

https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-templatehttps://demo.tailadmin.com/crm

- 

Será um dash específico para Gestão de Tráfego - São 17 contas de anúncio que quero que possamos monitorar o funil geral puxando da API da Meta via token; Nas configurações insira a opção para cadastrar as act_id (cadastrar act_id e unidade)

Precisa ser permitido puxar por período, mês e/ou ano.

Quero inserir gráficos e deixar visualmente agradável para análise e decisão. Quero também uma ponte para conexão com a ia meta/muse-glimmer-30b para que auxilie nas decisões.

Objetivo é que as decisões serão baseadas em métricas e informações extraídas da API da Meta, portanto precisa ser direto e assertivo

Ranking com unidades com mais leads, investimento, cpl, e afins. Personalizável

Precisamos de usuários e roles, crie o user admin e o user comum, diferença é que o admin consegue mexer nas roles e criar usuários, apenas. crie o usuario login: admin senha: admin

uma aba de configurações visto apenas pelo admin para inserir os tokens das apis necessárias. No meta insira para o token temporário e também para o permanente. Nessa mesma aba será configurado a IA da forma mais moderna possível;

Quero uma sessão também para conseguirmos trackear os leads que estão indo para o whatsapp de cada unidade.

Na aba Leads Whatsapp, vamos trabalhar com cards em lista com possibilidade de paginação: cada card é uma conversa do whatsapp rastreada - nesses cards constarão informações importantes como nome, numero, hora e data do primeiro contato, unidade, e mais coisas se possível como se já foi respondido ou não, ao clicar em expandir o card exibirá de qual campanha, conjunto e todo trackeamento de onde veio o lead. tudo isso precisa de uma aba para todas as devidas configurações 

O mais importante no momento é a lista da WhatsApp Business Cloud API para as conversas do whatsapp, precisa finalizar isso;

Quero uma configuração também para o que será exibido na visão geral, poder editar e escolher charts, dando total prioridade aos mais estratégicos

Configuração de aparencia e logotipo também na aba configurações

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://adfunnel-visualizer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a634ad2d-bf41-4e04-b9eb-688687f90fa6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
