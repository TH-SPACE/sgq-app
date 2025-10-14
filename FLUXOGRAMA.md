# Fluxograma do Sistema THANOS (TCore v2.0.5)

## 1. Fluxo de Autenticação

```mermaid
flowchart TD
    A[Usuário acessa /] --> B[Página de Login]
    B --> C{Submete credenciais}
    C --> D{É Admin Local?}

    D -->|Sim| E[Valida email/senha local]
    E --> F{Credenciais válidas?}
    F -->|Não| Z[Redireciona /?erro=1]
    F -->|Sim| G[Busca/Cria usuário no BD]

    D -->|Não| H[Cria instância AD com credenciais do usuário]
    H --> I[Autentica no Active Directory]
    I --> J{Autenticação OK?}
    J -->|Não| Z
    J -->|Sim| K[Busca informações do usuário no AD]
    K --> L[Extrai: nome, email, cargo]
    L --> M[Busca/Cria usuário no BD MariaDB]
    M --> G

    G --> N[Cria sessão com dados do usuário]
    N --> O{Qual perfil?}
    O -->|ADM| P[Redireciona /admin]
    O -->|USER| Q[Redireciona /home]
    O -->|HE| R[Redireciona /planejamento-he]
```

## 2. Fluxo de Acesso às Rotas Protegidas

```mermaid
flowchart TD
    A[Requisição à rota protegida] --> B{Middleware: verificaLogin}
    B -->|Sem sessão| C[Redireciona para /]
    B -->|Com sessão| D{Qual tipo de rota?}

    D -->|/home/*| E{Middleware: verificaUSER}
    E -->|Não é USER| F[Redireciona /logout-acesso-negado]
    E -->|É USER| G[Acesso permitido à rota]

    D -->|/admin/*| H{Middleware: verificaADM}
    H -->|Não é ADM| I[Exibe página acesso_negado.html]
    H -->|É ADM| J[Acesso permitido à rota]

    D -->|/planejamento-he/*| K{Middleware HE específico}
    K -->|heUserAuth| L[Verifica se é usuário HE]
    K -->|heAprovadorAuth| M[Verifica se é aprovador HE]
    K -->|heAuth| N[Verifica acesso geral HE]

    L --> O{Acesso OK?}
    M --> O
    N --> O
    O -->|Não| F
    O -->|Sim| P[Acesso permitido]
```

## 3. Arquitetura Geral do Sistema

```mermaid
flowchart TB
    subgraph Frontend
        A[Views HTML]
        B[Public CSS/JS]
        C[Views HE]
    end

    subgraph "Express App (app.js)"
        D[Servidor Express :3000]
        E[Session Middleware]
        F[Body Parser]
        G[Static Files]
    end

    subgraph "Rotas Públicas"
        H[/ - Login]
        I[/painel_reparos]
        J[/rampa-irr]
    end

    subgraph "Rotas Protegidas"
        K[/home - USER]
        L[/admin - ADM]
        M[/planejamento-he - HE]
        N[/consulta-ad]
    end

    subgraph Middlewares
        O[verificaLogin]
        P[verificaADM]
        Q[verificaUSER]
        R[heAuth]
        S[heAprovadorAuth]
        T[heUserAuth]
    end

    subgraph Controllers
        U[batimento_b2b.js]
        V[rampa_irr_controller.js]
        W[sigitm.js]
        X[uploadPosbd.js]
        Y[planejamentoHEController.js]
    end

    subgraph "Banco de Dados"
        Z[(MariaDB - users_thanos)]
        AA[(Oracle - SIGITM)]
    end

    subgraph "Serviços Externos"
        AB[Active Directory LDAP]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    G --> I
    G --> J

    H --> O
    I --> O
    J --> O

    O --> K
    O --> L
    O --> M
    O --> N

    K --> Q
    L --> P
    M --> R
    M --> S
    M --> T
    N --> O

    K --> U
    K --> V
    L --> W
    L --> X
    M --> Y

    U --> Z
    V --> Z
    W --> AA
    X --> Z
    Y --> Z

    O --> AB
    P --> AB
```

## 4. Fluxo do Módulo de Planejamento HE

```mermaid
flowchart TD
    A[Acesso /planejamento-he] --> B{Usuário logado?}
    B -->|Não| C[Redireciona para login HE]
    B -->|Sim| D{Tipo de usuário HE}

    D -->|Usuário Comum| E[Dashboard Usuário]
    E --> F[Minhas HE]
    E --> G[Enviar Solicitação]
    E --> H[Colaboradores]

    D -->|Aprovador| I[Dashboard Aprovador]
    I --> J[Visualizar Solicitações]
    I --> K[Aprovar/Reprovar HE]
    I --> L[Acompanhar Equipe]

    G --> M[Verifica limite_he.json]
    M --> N[Verifica valores_he.json]
    N --> O[Salva no BD]

    K --> P{Decisão}
    P -->|Aprovar| Q[Atualiza status - APROVADO]
    P -->|Reprovar| R[Atualiza status - REPROVADO]

    Q --> S[Notifica usuário]
    R --> S
```

## 5. Fluxo de Upload e Processamento (Rampa IRR)

```mermaid
flowchart TD
    A[Usuário acessa /rampa-irr] --> B[Página de Upload]
    B --> C[Seleciona arquivo Excel]
    C --> D[Submit formulário]
    D --> E[POST /rampa-irr/upload]
    E --> F[Multer processa arquivo]
    F --> G[rampaIrrController.processUpload]
    G --> H[Lê arquivo Excel com ExcelJS]
    H --> I[Valida dados]
    I --> J{Dados válidos?}
    J -->|Não| K[Retorna erro ao usuário]
    J -->|Sim| L[Processa dados]
    L --> M[Salva no banco de dados]
    M --> N[Retorna sucesso]
```

## 6. Fluxo de Consulta AD

```mermaid
flowchart TD
    A[Acesso /consulta-ad] --> B[Interface de busca]
    B --> C[Usuário insere critérios]
    C --> D[Submit busca]
    D --> E[consulta_controller.js]
    E --> F[Conecta ao AD com credenciais do .env]
    F --> G[Executa query LDAP]
    G --> H{Usuário encontrado?}
    H -->|Não| I[Retorna mensagem: não encontrado]
    H -->|Sim| J[Extrai informações]
    J --> K[Retorna: nome, email, cargo, departamento]
    K --> L[Exibe resultados na interface]
```

## 7. Estrutura de Dados - Sessão do Usuário

```mermaid
classDiagram
    class Session {
        +Object usuario
    }

    class Usuario {
        +int id
        +string nome
        +string email
        +string perfil
        +string cargo
        +Array acessos
    }

    Session --> Usuario
```

## 8. Fluxo de Logout

```mermaid
flowchart TD
    A{Tipo de logout} --> B[/auth/logout]
    A --> C[/auth/logout-he]
    A --> D[/logout-acesso-negado]

    B --> E[req.session.destroy]
    C --> E
    D --> E

    E --> F{Logout bem-sucedido?}
    F -->|Sim| G{Qual tipo?}
    F -->|Não| H[Log de erro]

    G -->|Normal| I[Redireciona para /]
    G -->|HE| J[Redireciona /planejamento-he]
    G -->|Acesso Negado| K[Exibe acesso_negado.html]

    H --> I
```

## 9. Estrutura de Módulos

```mermaid
graph TD
    A[app.js - Servidor Principal] --> B[Routes]
    A --> C[Controllers]
    A --> D[Middlewares]
    A --> E[Views]
    A --> F[DB]

    B --> B1[auth.js - Autenticação]
    B --> B2[protected.js - Rotas USER]
    B --> B3[admin.js - Rotas ADM]
    B --> B4[planejamentoHERoutes.js]
    B --> B5[consulta_route.js]

    C --> C1[batimento_b2b.js]
    C --> C2[rampa_irr_controller.js]
    C --> C3[sigitm.js]
    C --> C4[uploadPosbd.js]
    C --> C5[planejamentoHEController.js]

    D --> D1[autenticacao.js]
    D --> D2[heAuth.js]
    D --> D3[heAprovadorAuth.js]
    D --> D4[heUserAuth.js]

    F --> F1[db.js - MySQL Pool]
    F --> F2[db.js - Oracle Pool]

    E --> E1[login.html]
    E --> E2[index.html]
    E --> E3[admin_panel.html]
    E --> E4[planejamento_he.html]
```

## 10. Fluxo de Conexão com Bancos de Dados

```mermaid
flowchart TD
    A[Inicialização do app.js] --> B[Carrega db/db.js]
    B --> C[Cria Pool MySQL]
    B --> D[Inicializa Oracle]

    C --> E{Conexão MySQL OK?}
    E -->|Sim| F[Log: Conexão MariaDB estabelecida]
    E -->|Não| G[Log: Erro MySQL]

    D --> H{Conexão Oracle OK?}
    H -->|Sim| I[Log: Conexão Oracle estabelecida]
    H -->|Não| J[Log: Não está na Intranet]

    F --> K[Pool disponível para queries]
    I --> L[Pool Oracle disponível]

    K --> M[Controllers fazem queries]
    L --> N[SIGITM Controller usa Oracle]
```

---

## Legenda de Perfis

- **ADM**: Administrador com acesso total
- **USER**: Usuário comum com acesso limitado
- **HE User**: Usuário do módulo de Horas Extras
- **HE Aprovador**: Aprovador de Horas Extras

## Portas e Endpoints Principais

- **Porta**: 3000
- **Host**: 10.59.112.107
- **Públicas**: /, /login, /painel_reparos, /rampa-irr
- **Protegidas**: /home, /admin, /planejamento-he, /consulta-ad
