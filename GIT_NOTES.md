# Git Notes

## ПРАВИЛО: ВСЕГДА ИСПОЛЬЗОВАТЬ `--no-pager`

**ВСЕГДА вызывать git команды с флагом `--no-pager`**, чтобы избежать зависания в пейджере (less).

Примеры:
- `git --no-pager branch -a`
- `git --no-pager log --oneline`
- `git --no-pager diff`
- `git --no-pager status`

Это правило обязательно для всех git команд, которые могут выводить длинный текст.
