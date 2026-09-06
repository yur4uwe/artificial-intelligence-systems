export interface ContextMenuItem {
    label: string;
    action: () => void;
    danger?: boolean;
    divider?: boolean;
    disabled?: boolean;
}

export class ContextMenu {
    private element: HTMLElement;
    private isOpen: boolean = false;
    private boundPointerDown: (e: PointerEvent) => void;
    private boundKeyDown: (e: KeyboardEvent) => void;
    private boundResize: () => void;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'fixed z-50 min-w-[200px] py-1.5 px-1.5 rounded-xl backdrop-blur-md text-xs hidden select-none context-menu-panel';

        document.body.appendChild(this.element);

        this.boundPointerDown = (e: PointerEvent) => {
            if (this.isOpen && !this.element.contains(e.target as Node)) {
                this.hide();
            }
        };

        this.boundKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') this.hide();
        };

        this.boundResize = () => this.hide();

        this.attachGlobalListeners();
    }

    public show(x: number, y: number, items: ContextMenuItem[]): void {
        if (items.length === 0) return;

        this.renderItems(items);
        this.element.classList.remove('hidden');
        this.isOpen = true;

        // Viewport clamping so the menu never overflows off-screen
        const rect = this.element.getBoundingClientRect();
        const posX = x + rect.width > window.innerWidth ? x - rect.width : x;
        const posY = y + rect.height > window.innerHeight ? y - rect.height : y;

        this.element.style.left = `${Math.max(8, posX)}px`;
        this.element.style.top = `${Math.max(8, posY)}px`;
    }

    public hide(): void {
        if (!this.isOpen) return;
        this.element.classList.add('hidden');
        this.isOpen = false;
    }

    private renderItems(items: ContextMenuItem[]): void {
        this.element.innerHTML = '';

        items.forEach((item) => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.className = 'my-1 context-menu-divider';
                this.element.appendChild(divider);
            }

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.disabled = !!item.disabled;
            btn.className = `w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left font-medium cursor-pointer context-menu-item${item.danger ? ' danger' : ''}`;

            btn.innerHTML = `<span class="flex-1">${item.label}</span>`;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (item.disabled) return;
                this.hide();
                item.action();
            });

            this.element.appendChild(btn);
        });
    }

    private attachGlobalListeners(): void {
        window.addEventListener('pointerdown', this.boundPointerDown);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('resize', this.boundResize);
    }

    public destroy(): void {
        window.removeEventListener('pointerdown', this.boundPointerDown);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('resize', this.boundResize);
        this.element.remove();
    }
}
