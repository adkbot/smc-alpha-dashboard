-- Deletar operações fantasmas com entry_price = 0 (nunca foram executadas)
DELETE FROM operations WHERE entry_price = 0;

-- Deletar posições ativas com entry_price = 0
DELETE FROM active_positions WHERE entry_price = 0;