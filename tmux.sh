#!/bin/bash

SESSION="vinium"
WINDOW="runtime"
BASE_DIR="$HOME/Documents/personal/dev/projects/vinium"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"

# Если сессия уже существует — подключаемся к ней
if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Сессия '$SESSION' уже запущена. Подключаюсь..."
    tmux attach-session -t "$SESSION"
    exit 0
fi

# Создаём новую сессию с одним окном, но пока не разбиваем на панели
# Рабочая директория для всего окна будет BASE_DIR (для claude панели по умолчанию)
tmux new-session -d -s "$SESSION" -n "$WINDOW" -c "$BASE_DIR"

# Теперь настраиваем панели:
# 1. Сначала разделим окно вертикально на две части: левая и правая.
tmux split-window -h -p 60 -t "$SESSION:$WINDOW" -c "$BASE_DIR"

# 2. Теперь левую часть (панель 0) разделим горизонтально на верх и низ.
tmux split-window -v -t "$SESSION:$WINDOW.0" -c "$BASE_DIR"

# Итог: три панели:
#   .0 — левая верхняя (backend)
#   .1 — левая нижняя (frontend)
#   .2 — правая (claude)

# Отправляем команды в каждую панель

# Левая верхняя — переходим в backend и выводим подсказку
tmux send-keys -t "$SESSION:$WINDOW.0" "cd \"$BACKEND_DIR\"" C-m
tmux send-keys -t "$SESSION:$WINDOW.0" "clear" C-m

# Левая нижняя — переходим в frontend
tmux send-keys -t "$SESSION:$WINDOW.1" "cd \"$FRONTEND_DIR\"" C-m
tmux send-keys -t "$SESSION:$WINDOW.1" "clear" C-m

# Правая панель — запускаем claude (и тоже сразу переходим в BASE_DIR, хотя она там и так)
tmux send-keys -t "$SESSION:$WINDOW.2" "cd \"$BASE_DIR\"" C-m
tmux send-keys -t "$SESSION:$WINDOW.2" "claude" C-m

# Подключаемся к созданной сессии
tmux attach-session -t "$SESSION"