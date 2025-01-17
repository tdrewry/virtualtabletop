let mouseTarget = null;
let moveTarget = null;
const mouseStatus = {};

function eventCoords(name, e) {
  let coords;
  if(name == 'touchend')
    coords = e.changedTouches[0];
  else if(name == 'touchstart' || name == 'touchmove')
    coords = e.targetTouches[0];
  else
    coords = e;
  return [ coords.clientX, coords.clientY ];
}

async function inputHandler(name, e) {
  if(overlayActive || e.target.id == 'jeText' || e.target.id == 'jeCommands')
    return;

  const editMovable = edit || typeof jeEnabled == 'boolean' && jeEnabled && e.ctrlKey;

  if(!mouseTarget && [ "TEXTAREA", "INPUT", "BUTTON", "OPTION", "LABEL" ].indexOf(e.target.tagName) != -1)
    if(!editMovable || !e.target.parentNode || !e.target.parentNode.className.match(/label/))
      return;

  e.preventDefault();

  if(name == 'mousedown' || name == 'touchstart') {
    if (!window.getSelection().isCollapsed)
      window.getSelection().collapseToEnd();
    document.activeElement.blur();
  }
  let target = e.target;
  while(target && (!target.id || !widgets.has(target.id)))
    target = target.parentNode;

  const coords = eventCoords(name, e);
  if(name == 'mousedown')
    mouseTarget = target;
  else if(name == 'mousemove' || name == 'mouseup')
    target = mouseTarget;

  if(target && target.id) {
    batchStart();
    if(!edit && (!jeEnabled || !e.ctrlKey) && widgets.get(target.id).passthroughMouse) {
      if(name == 'mousedown' || name == 'touchstart') {
        await widgets.get(target.id).mouseRaw('down', (coords[0] - roomRectangle.left)/scale, (coords[1] - roomRectangle.top)/scale);
      } else if (name == 'mouseup' || name == 'touchend') {
        await widgets.get(target.id).mouseRaw('up', (coords[0] - roomRectangle.left)/scale, (coords[1] - roomRectangle.top)/scale);
      } else if (name == 'mousemove' || name == 'touchmove') {
        await widgets.get(target.id).mouseRaw('move', (coords[0] - roomRectangle.left)/scale, (coords[1] - roomRectangle.top)/scale);
      }
    } else if(name == 'mousedown' || name == 'touchstart') {
      mouseStatus[target.id] = {
        status: 'initial',
        start: new Date(),
        downCoords: coords
      };
      let movable = false;
      moveTarget = target;
      while (moveTarget && !movable) {
        movable = widgets.get(moveTarget.id).get(editMovable ? 'movableInEdit' : 'movable');
        if (!movable) {
          do {
            moveTarget = moveTarget.parentNode;
          } while (moveTarget && (!moveTarget.id || !widgets.has(moveTarget.id)));
        }
      }
    } else if(name == 'mouseup' || name == 'touchend') {
      const ms = mouseStatus[target.id];
      const timeSinceStart = +new Date() - ms.start;
      const pixelsMoved = ms.coords ? Math.abs(ms.coords[0] - ms.downCoords[0]) + Math.abs(ms.coords[1] - ms.downCoords[1]) : 0;
      if(ms.status != 'initial' && moveTarget)
        await ms.widget.moveEnd();
      if(ms.status == 'initial' || timeSinceStart < 250 && pixelsMoved < 10) {
        if(typeof jeEnabled == 'boolean' && jeEnabled)
          await jeClick(widgets.get(target.id), e);
        else if(edit)
          editClick(widgets.get(target.id));
        else
          await widgets.get(target.id).click();
      }
      delete mouseStatus[target.id];
    } else if(name == 'mousemove' || name == 'touchmove') {
      if(mouseStatus[target.id].status == 'initial') {
        const targetRect = moveTarget ? moveTarget.getBoundingClientRect() : target.getBoundingClientRect();
        const downCoords = mouseStatus[target.id].downCoords;
        Object.assign(mouseStatus[target.id], {
          status: 'moving',
          offset: [ downCoords[0] - (targetRect.left + targetRect.width/2), downCoords[1] - (targetRect.top + targetRect.height/2) ],
          widget: widgets.get(moveTarget ? moveTarget.id : target.id)
        });
        if(moveTarget)
          await mouseStatus[target.id].widget.moveStart();
      }
      mouseStatus[target.id].coords = coords;
      const x = Math.floor((coords[0] - roomRectangle.left - mouseStatus[target.id].offset[0]) / scale);
      const y = Math.floor((coords[1] - roomRectangle.top  - mouseStatus[target.id].offset[1]) / scale);
      if(moveTarget)
        await mouseStatus[target.id].widget.move(x, y);
    }
    batchEnd();
  }

  if(name == 'mouseup') {
    mouseTarget = null;
    moveTarget = null;
  }
  if(name == 'mousemove' || name == 'touchmove')
    toServer('mouse', [ Math.floor((coords[0] - roomRectangle.left)/scale), Math.floor((coords[1] - roomRectangle.top)/scale) ]);
}

onLoad(function() {
  [ 'touchstart', 'touchend', 'touchmove', 'mousedown', 'mousemove', 'mouseup', 'contextmenu' ].forEach(function(event) {
    window.addEventListener(event, e => inputHandler(event, e));
  });
});
