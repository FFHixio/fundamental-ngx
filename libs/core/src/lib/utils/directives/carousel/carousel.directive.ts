import {
    AfterContentInit,
    ChangeDetectorRef,
    ContentChildren,
    Directive,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    QueryList
} from '@angular/core';
import {
    AnimationPlayer,
} from '@angular/animations';
import { CarouselItemDirective } from './carousel-item.directive';
import * as Hammer from 'hammerjs';
import { HammerConfig } from './carousel.module';
import { Subject } from 'rxjs';


export interface CarouselConfig {
    vertical?: boolean;
    elementsAtOnce?: number;
    panSupport?: boolean
    infinite?: boolean;
    transition?: string;
}

export const Default_Transition_Duration: string = '150ms';


@Directive({
    selector: '[fdCarousel]',
    host: {
        class: 'fd-carousel'
    }
})
export class CarouselDirective implements AfterContentInit {

    @Input()
    config: CarouselConfig;

    @Input()
    active: CarouselItemDirective;

    @Input()
    panSupport: boolean = true;

    @Output()
    readonly activeChange: EventEmitter<CarouselItemDirective> = new EventEmitter<CarouselItemDirective>();

    @Output()
    readonly dragged: EventEmitter<boolean> = new EventEmitter<boolean>();

    @ContentChildren(CarouselItemDirective)
    items: QueryList<CarouselItemDirective>;

    private _previousActiveItem: CarouselItemDirective;
    private _player: AnimationPlayer;
    private _lastDistance: number = 0;
    private _currentTransitionPx: number = 0;

    private _size: number;

    private _panMoved$ = new Subject<number>();
    private _panMovedCheck$ = new Subject<number>();

    constructor(
        private _elementRef: ElementRef,
        private _changeDetRef: ChangeDetectorRef
    ) {
        this._panMoved$.subscribe(delta => this._handlePan(delta));
    }

    ngAfterContentInit(): void {

        if (this.config.panSupport) {
            this._hammerSetup();
        }
    }

    goToItem(item: CarouselItemDirective, smooth?: boolean): void {

        let index: number = this.getIndexOfItem(item);

        if (this.config.infinite) {
            this._centerActive(index);
            index = this.getIndexOfItem(item);
        }

        this._transitionToIndex(index, smooth);

        this._previousActiveItem = item;
    }

    nextElement(): void {

    }

    private _handlePan(delta: number): void {
        const distance: number = delta - this._lastDistance;

        this._lastDistance = delta;

        this._transitionCarousel(this._currentTransitionPx + distance);
    }

    private _handlePanEnd(delta) {
        this._handlePan(delta);

        const closestItem: CarouselItemDirective = this._getClosest();

        this.goToItem(closestItem, true);

        this.activeChange.emit(closestItem);

        this.dragged.emit(false);
        this._lastDistance = 0;
    }

    private _centerActive(index: number): void {
        const middleIndex = Math.ceil(this.items.length / 2);
        const offset = Math.ceil(this.config.elementsAtOnce / 2);
        const missingItems = (index + offset) - middleIndex;
        const array = this.items.toArray();

        if (missingItems > 0) {
            for (let i = 0; i < missingItems; i ++) {
                array.push(array.shift())
            }
        } else {
            for (let i = 0; i < Math.abs(missingItems); i ++) {
                array.unshift(array.pop())
            }
        }

        this.items.reset(array);
        this.items.forEach(item => item.getElement().parentNode.appendChild(item.getElement()));


        /** TODO: Comment */
        this._elementRef.nativeElement.style.transitionDuration = '0s';
        this._transitionCarousel(this._currentTransitionPx + this._getSize(this.items.first) * missingItems);
    }

    private _transitionToIndex(index: number, smooth?: boolean): void {
        const transitionPx: number = this._getSize(this.items.first) * index;

        // Performance Saving Purposes
        // const transitionPx: number = this.items
        //     .filter((_item, _index) => _index < index - this.config.amountAtOnce)
        //     .map(_item => _item.getHeight())
        //     .reduce((_item: number, sum: number) => sum + _item)
        // ;


        if (smooth) {
            this._elementRef.nativeElement.style.transitionDuration = this._getTransition();
        } else {
            this._elementRef.nativeElement.style.transitionDuration = '0s';
        }

        this._transitionCarousel(-transitionPx);
    }

    private _getClosest(): CarouselItemDirective {

        const size: number = this._getSize(this.items.first);

        // TODO Comment
        const halfApproached: boolean =
            Math.abs(this._currentTransitionPx % size) >
            size / 2
        ;

        const index: number =
            Math.ceil(this._currentTransitionPx / size)
        ;

        let absIndex = Math.abs(index);

        if (this.items.toArray()[absIndex]) {
            absIndex = absIndex + (halfApproached ? 1 : 0);
            return this.items.toArray()[absIndex];
        } else {
            if (index > 0) {
                return this.items.first;
            } else {
                return this.items.last;
            }
        }
    }

    private getIndexOfItem(item: CarouselItemDirective): number {
        return this.items.toArray().findIndex(_item => _item === item);
    }

    private _getOverflowItems(): number {
        return Math.ceil(this.items.length / 5);
    }

    private _hammerSetup(): void {
        const hammer = new Hammer(this._elementRef.nativeElement, new HammerConfig());

        hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        if (this.config.vertical) {
            hammer.on('panmove', (event) => this._panMoved$.next(event.deltaY));
            hammer.on('panstart', () => this._handlePanStart());
            hammer.on('panend', (event) => this._handlePanEnd(event.deltaY));
        } else {
            hammer.on('panmove', (event) => this._panMoved$.next(event.deltaX));
            hammer.on('panstart', () => this._handlePanStart());
            hammer.on('panend', (event) => this._handlePanEnd(event.deltaX));
        }
    }

    private _handlePanStart(): void {
        this._size = this._getSize(this.items.first);
        this._elementRef.nativeElement.style.transitionDuration = '0s';
        this.dragged.emit(true);
    }

    /**
     * Animates the carousel to the currently selected slide.
     */
    private _transitionCarousel(transitionPx: number) {

        this._currentTransitionPx = transitionPx;

        if (this.config.vertical) {

            this._elementRef.nativeElement.style.transform = 'translateY(' + this._currentTransitionPx + 'px)';

        } else {

            this._elementRef.nativeElement.style.transform = 'translateX(' + this._currentTransitionPx + 'px)';

        }

        // TODO Test scrolling
        // this._elementRef.nativeElement.scrollTo({
        //     top: this._currentTransitionPx,
        //     left: 0,
        //     behavior: 'smooth'
        // });


        // TODO Consider animation usage -> poor performance
        // style({ transform: `translateY(${offset}px)` })
        // const myAnimation: AnimationFactory = this.buildAnimation(this._currentTransitionPx, time);
        //
        // this._player = myAnimation.create(this._elementRef.nativeElement);
        // this._player.play();
    }

    // private buildAnimation(offset, time: boolean) {
    //     return this._builder.build([
    //         animate(time ? this._getTransition() : 0, style({ transform: `translateY(${offset}px)` }))
    //     ]);
    // }

    private _getTransition(): string {
        if (this.config) {
            return this.config.transition;
        } else {
            return Default_Transition_Duration;
        }
    }

    private _getSize(item: CarouselItemDirective): number {
        if (this.config.vertical) {
            return item.getHeight();
        } else {
            return item.getWidth();
        }
    }

}