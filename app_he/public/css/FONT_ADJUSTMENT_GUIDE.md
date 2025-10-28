# Guia de Ajuste de Tamanhos de Fonte

Este documento explica como ajustar os tamanhos de fonte na aplicação.

## 1. Arquivos Relevantes

- `font-config.css` - Arquivo principal de configuração de tamanhos de fonte
- `planejamento-he-custom.css` - CSS principal da aplicação
- `frequencia-custom.css` - CSS específico para o painel de frequência

## 2. Como Ajustar os Tamanhos de Fonte

### Método 1: Ajustando Variáveis CSS (Recomendado)

Edite o arquivo `font-config.css` e modifique as variáveis na seção `:root`:

```css
:root {
  /* Tamanhos de fonte para diferentes elementos */
  --font-size-tiny: 0.65rem;     /* Muito pequeno */
  --font-size-xs: 0.7rem;        /* Extra pequeno */
  --font-size-sm: 0.75rem;       /* Pequeno */
  --font-size-base: 0.8rem;      /* Base */
  --font-size-md: 0.85rem;       /* Médio */
  --font-size-lg: 0.9rem;        /* Grande */
  --font-size-xl: 1rem;          /* Extra grande */
  --font-size-xxl: 1.1rem;       /* Extra extra grande */
  --font-size-xxxl: 1.2rem;      /* Máximo */
  
  /* Tamanhos específicos para elementos da interface */
  --font-size-navbar: 1.1rem;
  --font-size-sidebar-menu: 0.8rem;
  --font-size-card-title: 1.3rem;
  --font-size-form-label: 0.8rem;
  --font-size-form-input: 0.8rem;
  --font-size-button: 0.8rem;
  --font-size-table-header: 0.8rem;
  --font-size-table-cell: 0.8rem;
  --font-size-badge: 0.7rem;
}
```

### Método 2: Usando Classes Utilitárias

Você pode aplicar classes diretamente nos elementos HTML:

```html
<p class="font-xs">Texto extra pequeno</p>
<h2 class="font-lg">Título grande</h2>
<span class="font-xl">Texto extra grande</span>
```

### Método 3: Ajustando Elementos Específicos

Para ajustar elementos específicos, edite os arquivos CSS:

```css
/* Ajustar tamanho de títulos de cards */
.card-title {
  font-size: 1.5rem; /* Ajuste conforme necessário */
}

/* Ajustar tamanho de texto em tabelas */
.table th,
.table td {
  font-size: 0.9rem; /* Ajuste conforme necessário */
}

/* Ajustar tamanho de botões */
.btn {
  font-size: 0.85rem; /* Ajuste conforme necessário */
}
```

## 3. Tamanhos Recomendados

### Para telas de desktop:
- Texto normal: 0.8rem - 0.9rem
- Títulos: 1.1rem - 1.3rem
- Cabeçalhos: 1.5rem - 2rem
- Botões: 0.8rem - 0.9rem

### Para telas menores:
- Texto normal: 0.7rem - 0.8rem
- Títulos: 0.9rem - 1.1rem
- Cabeçalhos: 1.2rem - 1.5rem
- Botões: 0.7rem - 0.8rem

## 4. Testando as Alterações

1. Faça backup dos arquivos antes de editar
2. Edite as variáveis CSS no arquivo `font-config.css`
3. Salve o arquivo
4. Recarregue a página no navegador (pressione F5)
5. Verifique os resultados
6. Ajuste conforme necessário

## 5. Dicas Adicionais

- Use `rem` como unidade para manter consistência
- Evite usar `px` para tamanhos de fonte, pois não se adapta bem às preferências do usuário
- Teste as alterações em diferentes tamanhos de tela
- Mantenha uma hierarquia visual clara (títulos maiores que textos normais)