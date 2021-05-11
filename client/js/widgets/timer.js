export class Timer extends Widget {
  constructor(id) {
    super(id);

    this.addDefaults({
      width: 74,
      height: 36,

      typeClasses: 'widget timer',
      layer: -1,
      movable: false,
      clickable: true,

      seconds: 0,
      precision: 1,
      paused: true,
      countdown: false,
      start: 0,
      end: null
    });
  }

  applyDeltaToDOM(delta) {
    super.applyDeltaToDOM(delta);
    if(delta.seconds !== undefined) {
      const s = Math.abs(delta.seconds);
      this.domElement.textContent = `${delta.seconds < 0 ? '-' : ''}${Math.floor(s/60)}:${Math.floor(s%60)}`.replace(/:(\d)$/, ':0$1');
    }
    if(delta.paused !== undefined && delta.paused && this.interval)
      clearInterval(this.interval);
  }

  async click() {
    await this.togglePaused();
  }

  getImage() {
    if(!Object.keys(this.get('svgReplaces')).length)
      return this.get('image');

    const replaces = {};
    for(const key in this.get('svgReplaces'))
      replaces[key] = this.get(this.get('svgReplaces')[key]);
    return getSVG(this.get('image'), replaces, _=>this.domElement.style.cssText = this.css());
  }

  onPropertyChange(property, oldValue, newValue) {
    super.onPropertyChange(property, oldValue, newValue);
    if(this.get('end')!=null){
      if ((this.get('countdown') && this.get('seconds')<=this.get('end')) || (!this.get('countdown') && this.get('seconds')>=this.get('end')) ) {
        this.set('typeClasses','widget timer alert')
      } else {this.set('typeClasses','widget timer')};
    } else {this.set('typeClasses','widget timer')};
    if(property == 'paused') {
      if(this.get('paused') && this.interval)
        clearInterval(this.interval);
      if(!this.get('paused'))
        this.interval = setInterval(_=>this.tick(), 1000*this.get('precision'));
    }
  }

  async tick() {
    await this.set('seconds', this.get('precision')*Math.round((this.get('seconds') + (this.get('countdown') ? -1 : 1)*this.get('precision'))/this.get('precision')));
  }

  async togglePaused(paused) {
    await this.set('precision', Math.max(this.get('precision'), 0.1))
    await this.set('paused', paused === undefined ? !this.get('paused') : paused);
  }
}
