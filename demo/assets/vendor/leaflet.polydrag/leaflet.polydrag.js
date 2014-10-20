L.Handler.PolyDrag = L.Handler.extend({
    initialize: function (poly) {
        this._poly = poly;
    },

    addHooks: function () {
        var container = this._poly._container;
        if (!this._draggable) {
            this._draggable = new L.DraggablePoly(container, container)
            .on('dragstart', this._onDragStart, this)
            .on('drag', this._onDrag, this)
            .on('dragend', this._onDragEnd, this);
        }
        this._draggable.enable();
    },

    removeHooks: function () {
        this._draggable.disable();
    },

    moved: function () {
        return this._draggable && this._draggable._moved;
    },

    _onDragStart: function (e) {
        if (this._poly.editing.enabled()) {
            this._wasEditing = true;
            this._poly.editing.disable();
        }
        this._poly
            .fire('movestart')
            .fire('dragstart');
    },

    _onDrag: function (e) {
        L.DomUtil.setPosition(this._poly._container, e.target._totalDiffVec);
        this._poly
            .fire('move')
            .fire('drag');
    },

    _onDragEnd: function (e) {
        var map = this._poly._map;
        var oldLatLngs = this._poly.getLatLngs();
        var newLatLngs = [];
        var i;
        for (i in oldLatLngs) {
            var oldContainerPoint = map.latLngToContainerPoint(oldLatLngs[i]);
            var newContainerPoint = 
                oldContainerPoint.add(e.target._totalDiffVec);
            newLatLngs.push(map.containerPointToLatLng(newContainerPoint));
        }
        L.DomUtil.setPosition(this._poly._container, new L.Point(0,0));
        this._poly.setLatLngs(newLatLngs);
        if (this._wasEditing) {
            this._poly.editing.enable();
            this._wasEditing = false;
        }
        this._poly
            .fire('moveend')
            .fire('dragend');
    }
});

L.DraggablePoly = L.Draggable.extend({
    _onDown: function (e) {
        if (
            (!L.Browser.touch && e.shiftKey) ||
             ((e.which !== 1) && (e.button !== 1) && !e.touches)
        ) {
            return;
        }

        this._simulateClick = true;

        if (e.touches && e.touches.length > 1) {
            this._simulateClick = false;
            return;
        }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);
        var el = first.target;

        L.DomEvent.stop(e);

        if (L.Browser.touch && el.tagName.toLowerCase() === 'a') {
            L.DomUtil.addClass(el, 'leaflet-active');
        }

        this._moved = false;
        if (this._moving) {
            return;
        }

        if (!L.Browser.touch) {
            L.DomUtil.disableTextSelection();
            this._setMovingCursor();
        }

        this._startPoint = new L.Point(first.clientX, first.clientY);

        L.DomEvent.on(document, L.Draggable.MOVE, this._onMove, this);
        L.DomEvent.on(document, L.Draggable.END, this._onUp, this);
    },

    _onMove: function (e) {
        if (e.touches && e.touches.length > 1) { return; }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e);
        if (this._moved) {
            this._lastPoint = this._newPoint;
        } else {
            this._lastPoint = this._startPoint;
        }
        this._newPoint = new L.Point(first.clientX, first.clientY);
        this._diffVec = this._newPoint.subtract(this._lastPoint);
        this._totalDiffVec = new L.Point(e.clientX, e.clientY).subtract(
            this._startPoint
        );


        if (!this._diffVec.x && !this._diffVec.y) { return; }

        L.DomEvent.stop(e);

        if (!this._moved) {
            this.fire('dragstart');
            this._moved = true;
        }

        this._moving = true;

        L.Util.cancelAnimFrame(this._animRequest);
        this._animRequest = L.Util.requestAnimFrame(
            this._updatePosition, this, true, this._dragStartTarget
        );
    },

    _updatePosition: function () {
        this.fire('predrag');
        this.fire('drag');
    },

    _onUp: function (e) {
        this._totalDiffVec = new L.Point(e.clientX, e.clientY).subtract(
            this._startPoint
        );

        if (this._simulateClick && e.changedTouches) {
            var first = e.changedTouches[0];
            var el = first.target;
            var dist = 
                (this._newPos && this._newPos.distanceTo(this._startPos)) ||
                0;

            if (el.tagName.toLowerCase() === 'a') {
                L.DomUtil.removeClass(el, 'leaflet-active');
            }

            if (dist < L.Draggable.TAP_TOLERANCE) {
                this._simulateEvent('click', first);
            }
        }

        if (!L.Browser.touch) {
            L.DomUtil.enableTextSelection();
            this._restoreCursor();
        }

        L.DomEvent.off(document, L.Draggable.MOVE, this._onMove);
        L.DomEvent.off(document, L.Draggable.END, this._onUp);

        if (this._moved) {
            // ensure drag is not fired after dragend
            L.Util.cancelAnimFrame(this._animRequest);

            this.fire('dragend');
        }
        this._moving = false;
    }
});
