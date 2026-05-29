# Como gerar o instalador do DUIMP Converter

## Pré-requisitos

- Node.js 18+ instalado
- Inno Setup 6 instalado → https://jrsoftware.org/isdl.php

---

## Passo 1 — Build

Execute o script de build (apenas quando houver mudanças no código):

```
build.bat
```

Isso irá:
1. Compilar o frontend React (Vite)
2. Copiar os arquivos para `backend/public`
3. Compilar o backend em `dist/duimp-converter.exe` com pkg (~50 MB)
4. Preparar a pasta `dist/` com todos os arquivos

---

## Passo 2 — Gerar o instalador

1. Abra o **Inno Setup 6**
2. Abra o arquivo `installer.iss`
3. Clique em **Build → Compile** (ou `Ctrl+F9`)
4. O instalador será gerado em: `dist/DUIMPConverter-Setup-v1.0.0.exe`

---

## Estrutura gerada

```
dist/
├── duimp-converter.exe       ← executável principal (Node.js embutido)
├── public/                   ← frontend React compilado
│   ├── index.html
│   └── assets/
├── launcher.vbs              ← inicia sem janela do console
└── DUIMPConverter-Setup-v1.0.0.exe  ← INSTALADOR FINAL
```

---

## O que o instalador faz

- Instala em `C:\Users\{usuario}\AppData\Local\Programs\DUIMP Converter`
- Cria atalho na **Área de Trabalho**
- Cria entrada no **Menu Iniciar**
- Ao clicar no atalho: inicia o servidor e abre o browser automaticamente
- Inclui desinstalador

---

## Versão / atualização

Para atualizar a versão, edite a linha no `installer.iss`:

```
#define MyAppVersion   "1.0.1"
```

E repita os passos 1 e 2.
