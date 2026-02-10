# BSC Swap Bot

CLI-бот для покупки токенов на BSC через PancakeSwap (V2 / V3 / V4).

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Скопировать и заполнить .env
cp .env.example .env

# 3. Купить токен
npx ts-node src/index.ts -t <TOKEN_ADDRESS> -a <AMOUNT_BNB>
```

## Запуск

```bash
npx ts-node src/index.ts -t <TOKEN_ADDRESS> -a <AMOUNT_BNB> [-s <SLIPPAGE>]
```

| Флаг | Описание | Обязательный |
|---|---|---|
| `-t, --token <address>` | Адрес токена для покупки | ✅ |
| `-a, --amount <bnb>` | Сколько BNB потратить | ✅ |
| `-s, --slippage <percent>` | Slippage (%), по умолчанию `12` | нет |

### Примеры

```bash
# Купить CAKE на 0.01 BNB
npx ts-node src/index.ts -t 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82 -a 0.01

# Купить USDT на 0.5 BNB со slippage 5%
npx ts-node src/index.ts -t 0x55d398326f99059fF775485246999027B3197955 -a 0.5 -s 5

# Показать справку
npx ts-node src/index.ts --help
```

## Настройка (.env)

| Переменная | Описание | По умолчанию |
|---|---|---|
| `PRIVATE_KEY` | Приватный ключ или мнемоник-фраза | — |
| `BSC_RPC_URL` | RPC-нода BSC | `https://bsc-dataseed1.binance.org` |
| `SLIPPAGE_PERCENT` | Slippage (%) | `12` |
| `GAS_LIMIT` | Gas limit | `300000` |
| `DEADLINE_MINUTES` | Deadline транзакции (мин) | `20` |

`PRIVATE_KEY` поддерживает оба формата:
- Hex: `a1b2c3d4e5...` (с или без `0x`)
- Мнемоник: `word1 word2 word3 ... word12`

## Что делает бот

1. Принимает адрес токена и сумму через CLI
2. Запрашивает пулы через Dexscreener API (только BSC)
3. Фильтрует по PancakeSwap V2/V3/V4
4. Выбирает пул с максимальной ликвидностью
5. Выполняет swap BNB → Token
6. Логирует весь процесс в консоль и в файл `swap-bot.log`

## Пример вывода

```
[12:34:56] info: Token address: 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82
[12:34:56] info: Amount: 0.01 BNB | Slippage: 12%
---
[12:34:57] info: Found 12 BSC pool(s) total
[12:34:57] info: ✅ Selected pool: Cake/WBNB on pancakeswap_v2 (v2) — liquidity: $13,823,344
---
[12:34:57] info: Wallet: 0xYourAddress...
[12:34:57] info: Swapping 0.01 BNB → Cake (V2)
[12:34:58] info: 🔗 TX: https://bscscan.com/tx/0x...
[12:35:05] info: ✅ Swap confirmed!
---
[12:35:05] info: ✅ Done! TX hash: 0x...
```

## Тесты

```bash
npm test                 # unit тесты
npm run test:integration # integration (реальный Dexscreener API)
npm run test:all         # всё вместе
```

## Диалог

В репозитории сохранён диалог с нейросетью по разработке/правкам проекта: `Dialog.md`.

## Структура проекта

```
src/
  index.ts              — CLI (commander)
  config/
    env.ts              — переменные из .env
    constants.ts        — WBNB, роутеры PancakeSwap
  core/
    dexscreener.ts      — поиск пулов через API
    swap.ts             — оркестратор swap
    swap-v2.ts          — PancakeSwap V2
    swap-v3.ts          — PancakeSwap V3/V4
  types/
    index.ts            — TypeScript интерфейсы
  utils/
    logger.ts           — winston логгер
    wallet.ts           — создание кошелька
  abi/
    routerV2.ts         — ABI V2 Router
    routerV3.ts         — ABI V3 SwapRouter
tests/
  unit/                 — unit тесты (моки)
  integration/          — integration тесты (реальный API)
```

## ⚠️ Disclaimer

Бот работает с реальными средствами. Используйте на свой страх и риск. Тестируйте с малыми суммами.
