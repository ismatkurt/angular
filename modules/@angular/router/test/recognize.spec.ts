import {RouterConfig} from '../src/config';
import {recognize} from '../src/recognize';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '../src/router_state';
import {PRIMARY_OUTLET, Params} from '../src/shared';
import {DefaultUrlSerializer, UrlTree} from '../src/url_tree';

describe('recognize', () => {
  it('should work', () => {
    checkRecognize([{path: 'a', component: ComponentA}], 'a', (s: RouterStateSnapshot) => {
      checkActivatedRoute(s.root, '', {}, RootComponent);
      checkActivatedRoute(s.firstChild(s.root), 'a', {}, ComponentA);
    });
  });

  it('should support secondary routes', () => {
    checkRecognize(
        [
          {path: 'a', component: ComponentA}, {path: 'b', component: ComponentB, outlet: 'left'},
          {path: 'c', component: ComponentC, outlet: 'right'}
        ],
        'a(left:b//right:c)', (s: RouterStateSnapshot) => {
          const c = s.children(s.root);
          checkActivatedRoute(c[0], 'a', {}, ComponentA);
          checkActivatedRoute(c[1], 'b', {}, ComponentB, 'left');
          checkActivatedRoute(c[2], 'c', {}, ComponentC, 'right');
        });
  });

  it('should set url segment and index properly', () => {
    const url = tree('a(left:b//right:c)');
    recognize(
        RootComponent,
        [
          {path: 'a', component: ComponentA}, {path: 'b', component: ComponentB, outlet: 'left'},
          {path: 'c', component: ComponentC, outlet: 'right'}
        ],
        url, 'a(left:b//right:c)')
        .subscribe((s) => {
          expect(s.root._urlSegment).toBe(url.root);
          expect(s.root._lastPathIndex).toBe(-1);

          const c = s.children(s.root);
          expect(c[0]._urlSegment).toBe(url.root.children[PRIMARY_OUTLET]);
          expect(c[0]._lastPathIndex).toBe(0);

          expect(c[1]._urlSegment).toBe(url.root.children['left']);
          expect(c[1]._lastPathIndex).toBe(0);

          expect(c[2]._urlSegment).toBe(url.root.children['right']);
          expect(c[2]._lastPathIndex).toBe(0);
        });
  });

  it('should set url segment and index properly (nested case)', () => {
    const url = tree('a/b/c');
    recognize(
        RootComponent,
        [
          {path: 'a/b', component: ComponentA, children: [{path: 'c', component: ComponentC}]},
        ],
        url, 'a/b/c')
        .subscribe((s: RouterStateSnapshot) => {
          expect(s.root._urlSegment).toBe(url.root);
          expect(s.root._lastPathIndex).toBe(-1);

          const compA = s.firstChild(s.root);
          expect(compA._urlSegment).toBe(url.root.children[PRIMARY_OUTLET]);
          expect(compA._lastPathIndex).toBe(1);

          const compC = s.firstChild(<any>compA);
          expect(compC._urlSegment).toBe(url.root.children[PRIMARY_OUTLET]);
          expect(compC._lastPathIndex).toBe(2);
        });
  });

  it('should match routes in the depth first order', () => {
    checkRecognize(
        [
          {path: 'a', component: ComponentA, children: [{path: ':id', component: ComponentB}]},
          {path: 'a/:id', component: ComponentC}
        ],
        'a/paramA', (s: RouterStateSnapshot) => {
          checkActivatedRoute(s.root, '', {}, RootComponent);
          checkActivatedRoute(s.firstChild(s.root), 'a', {}, ComponentA);
          checkActivatedRoute(
              s.firstChild(<any>s.firstChild(s.root)), 'paramA', {id: 'paramA'}, ComponentB);
        });

    checkRecognize(
        [{path: 'a', component: ComponentA}, {path: 'a/:id', component: ComponentC}], 'a/paramA',
        (s: RouterStateSnapshot) => {
          checkActivatedRoute(s.root, '', {}, RootComponent);
          checkActivatedRoute(s.firstChild(s.root), 'a/paramA', {id: 'paramA'}, ComponentC);
        });
  });

  it('should use outlet name when matching secondary routes', () => {
    checkRecognize(
        [
          {path: 'a', component: ComponentA}, {path: 'b', component: ComponentB, outlet: 'left'},
          {path: 'b', component: ComponentC, outlet: 'right'}
        ],
        'a(right:b)', (s: RouterStateSnapshot) => {
          const c = s.children(s.root);
          checkActivatedRoute(c[0], 'a', {}, ComponentA);
          checkActivatedRoute(c[1], 'b', {}, ComponentC, 'right');
        });
  });

  it('should handle non top-level secondary routes', () => {
    checkRecognize(
        [
          {
            path: 'a',
            component: ComponentA,
            children: [
              {path: 'b', component: ComponentB},
              {path: 'c', component: ComponentC, outlet: 'left'}
            ]
          },
        ],
        'a/(b//left:c)', (s: RouterStateSnapshot) => {
          const c = s.children(<any>s.firstChild(s.root));
          checkActivatedRoute(c[0], 'b', {}, ComponentB, PRIMARY_OUTLET);
          checkActivatedRoute(c[1], 'c', {}, ComponentC, 'left');
        });
  });

  it('should sort routes by outlet name', () => {
    checkRecognize(
        [
          {path: 'a', component: ComponentA}, {path: 'c', component: ComponentC, outlet: 'c'},
          {path: 'b', component: ComponentB, outlet: 'b'}
        ],
        'a(c:c//b:b)', (s: RouterStateSnapshot) => {
          const c = s.children(s.root);
          checkActivatedRoute(c[0], 'a', {}, ComponentA);
          checkActivatedRoute(c[1], 'b', {}, ComponentB, 'b');
          checkActivatedRoute(c[2], 'c', {}, ComponentC, 'c');
        });
  });

  it('should support matrix parameters', () => {
    checkRecognize(
        [
          {path: 'a', component: ComponentA, children: [{path: 'b', component: ComponentB}]},
          {path: 'c', component: ComponentC, outlet: 'left'}
        ],
        'a;a1=11;a2=22/b;b1=111;b2=222(left:c;c1=1111;c2=2222)', (s: RouterStateSnapshot) => {
          const c = s.children(s.root);
          checkActivatedRoute(c[0], 'a', {a1: '11', a2: '22'}, ComponentA);
          checkActivatedRoute(s.firstChild(<any>c[0]), 'b', {b1: '111', b2: '222'}, ComponentB);
          checkActivatedRoute(c[1], 'c', {c1: '1111', c2: '2222'}, ComponentC, 'left');
        });
  });

  describe('empty path', () => {
    describe('root', () => {
      it('should work', () => {
        checkRecognize([{path: '', component: ComponentA}], '', (s: RouterStateSnapshot) => {
          checkActivatedRoute(s.firstChild(s.root), '', {}, ComponentA);
        });
      });

      it('should match when terminal', () => {
        checkRecognize(
            [{path: '', terminal: true, component: ComponentA}], '', (s: RouterStateSnapshot) => {
              checkActivatedRoute(s.firstChild(s.root), '', {}, ComponentA);
            });
      });

      it('should not match when terminal', () => {
        recognize(
            RootComponent, [{
              path: '',
              terminal: true,
              component: ComponentA,
              children: [{path: 'b', component: ComponentB}]
            }],
            tree('b'), '')
            .subscribe(
                () => {}, (e) => { expect(e.message).toEqual('Cannot match any routes: \'b\''); });
      });

      it('should work (nested case)', () => {
        checkRecognize(
            [{path: '', component: ComponentA, children: [{path: '', component: ComponentB}]}], '',
            (s: RouterStateSnapshot) => {
              checkActivatedRoute(s.firstChild(s.root), '', {}, ComponentA);
              checkActivatedRoute(s.firstChild(<any>s.firstChild(s.root)), '', {}, ComponentB);
            });
      });

      it('should set url segment and index properly', () => {
        const url = tree('');
        recognize(
            RootComponent,
            [{path: '', component: ComponentA, children: [{path: '', component: ComponentB}]}], url,
            '')
            .forEach((s: RouterStateSnapshot) => {
              expect(s.root._urlSegment).toBe(url.root);
              expect(s.root._lastPathIndex).toBe(-1);

              const c = s.firstChild(s.root);
              expect(c._urlSegment).toBe(url.root);
              expect(c._lastPathIndex).toBe(-1);

              const c2 = s.firstChild(<any>s.firstChild(s.root));
              expect(c2._urlSegment).toBe(url.root);
              expect(c2._lastPathIndex).toBe(-1);
            });
      });
    });

    describe('aux split is in the middle', () => {
      it('should match (non-terminal)', () => {
        checkRecognize(
            [{
              path: 'a',
              component: ComponentA,
              children: [
                {path: 'b', component: ComponentB},
                {path: '', component: ComponentC, outlet: 'aux'}
              ]
            }],
            'a/b', (s: RouterStateSnapshot) => {
              checkActivatedRoute(s.firstChild(s.root), 'a', {}, ComponentA);

              const c = s.children(s.firstChild(s.root));
              checkActivatedRoute(c[0], 'b', {}, ComponentB);
              checkActivatedRoute(c[1], '', {}, ComponentC, 'aux');
            });
      });

      it('should match (terminal)', () => {
        checkRecognize(
            [{
              path: 'a',
              component: ComponentA,
              children: [
                {path: 'b', component: ComponentB},
                {path: '', terminal: true, component: ComponentC, outlet: 'aux'}
              ]
            }],
            'a/b', (s: RouterStateSnapshot) => {
              checkActivatedRoute(s.firstChild(s.root), 'a', {}, ComponentA);

              const c = s.children(s.firstChild(s.root));
              expect(c.length).toEqual(1);
              checkActivatedRoute(c[0], 'b', {}, ComponentB);
            });
      });

      it('should set url segment and index properly', () => {
        const url = tree('a/b');
        recognize(
            RootComponent, [{
              path: 'a',
              component: ComponentA,
              children: [
                {path: 'b', component: ComponentB},
                {path: '', component: ComponentC, outlet: 'aux'}
              ]
            }],
            url, 'a/b')
            .forEach((s: RouterStateSnapshot) => {
              expect(s.root._urlSegment).toBe(url.root);
              expect(s.root._lastPathIndex).toBe(-1);

              const a = s.firstChild(s.root);
              expect(a._urlSegment).toBe(url.root.children[PRIMARY_OUTLET]);
              expect(a._lastPathIndex).toBe(0);

              const b = s.firstChild(a);
              expect(b._urlSegment).toBe(url.root.children[PRIMARY_OUTLET]);
              expect(b._lastPathIndex).toBe(1);

              const c = s.children(a)[1];
              expect(c._urlSegment).toBe(url.root.children[PRIMARY_OUTLET]);
              expect(c._lastPathIndex).toBe(0);
            });
      });
    });

    describe('aux split at the end (no right child)', () => {
      it('should match (non-terminal)', () => {
        checkRecognize(
            [{
              path: 'a',
              component: ComponentA,
              children: [
                {path: '', component: ComponentB},
                {path: '', component: ComponentC, outlet: 'aux'},
              ]
            }],
            'a', (s: RouterStateSnapshot) => {
              checkActivatedRoute(s.firstChild(s.root), 'a', {}, ComponentA);

              const c = s.children(s.firstChild(s.root));
              checkActivatedRoute(c[0], '', {}, ComponentB);
              checkActivatedRoute(c[1], '', {}, ComponentC, 'aux');
            });
      });

      it('should match (terminal)', () => {
        checkRecognize(
            [{
              path: 'a',
              component: ComponentA,
              children: [
                {path: '', terminal: true, component: ComponentB},
                {path: '', terminal: true, component: ComponentC, outlet: 'aux'},
              ]
            }],
            'a', (s: RouterStateSnapshot) => {
              checkActivatedRoute(s.firstChild(s.root), 'a', {}, ComponentA);

              const c = s.children(s.firstChild(s.root));
              checkActivatedRoute(c[0], '', {}, ComponentB);
              checkActivatedRoute(c[1], '', {}, ComponentC, 'aux');
            });
      });

      it('should work only only primary outlet', () => {
        checkRecognize(
            [{
              path: 'a',
              component: ComponentA,
              children: [
                {path: '', component: ComponentB},
                {path: 'c', component: ComponentC, outlet: 'aux'},
              ]
            }],
            'a/(aux:c)', (s: RouterStateSnapshot) => {
              checkActivatedRoute(s.firstChild(s.root), 'a', {}, ComponentA);

              const c = s.children(s.firstChild(s.root));
              checkActivatedRoute(c[0], '', {}, ComponentB);
              checkActivatedRoute(c[1], 'c', {}, ComponentC, 'aux');
            });
      });
    });

    describe('split at the end (right child)', () => {
      it('should match (non-terminal)', () => {
        checkRecognize(
            [{
              path: 'a',
              component: ComponentA,
              children: [
                {path: '', component: ComponentB, children: [{path: 'd', component: ComponentD}]},
                {
                  path: '',
                  component: ComponentC,
                  outlet: 'aux',
                  children: [{path: 'e', component: ComponentE}]
                },
              ]
            }],
            'a/(d//aux:e)', (s: RouterStateSnapshot) => {
              checkActivatedRoute(s.firstChild(s.root), 'a', {}, ComponentA);

              const c = s.children(s.firstChild(s.root));
              checkActivatedRoute(c[0], '', {}, ComponentB);
              checkActivatedRoute(s.firstChild(c[0]), 'd', {}, ComponentD);
              checkActivatedRoute(c[1], '', {}, ComponentC, 'aux');
              checkActivatedRoute(s.firstChild(c[1]), 'e', {}, ComponentE);
            });
      });
    });
  });

  describe('wildcards', () => {
    it('should support simple wildcards', () => {
      checkRecognize(
          [{path: '**', component: ComponentA}], 'a/b/c/d;a1=11', (s: RouterStateSnapshot) => {
            checkActivatedRoute(s.firstChild(s.root), 'a/b/c/d', {a1: '11'}, ComponentA);
          });
    });
  });

  describe('componentless routes', () => {
    it('should work', () => {
      checkRecognize(
          [{
            path: 'p/:id',
            children: [
              {path: 'a', component: ComponentA},
              {path: 'b', component: ComponentB, outlet: 'aux'}
            ]
          }],
          'p/11;pp=22/(a;pa=33//aux:b;pb=44)', (s: RouterStateSnapshot) => {
            const p = s.firstChild(s.root);
            checkActivatedRoute(p, 'p/11', {id: '11', pp: '22'}, undefined);

            const c = s.children(p);
            checkActivatedRoute(c[0], 'a', {id: '11', pp: '22', pa: '33'}, ComponentA);
            checkActivatedRoute(c[1], 'b', {id: '11', pp: '22', pb: '44'}, ComponentB, 'aux');
          });
    });

    it('should merge params until encounters a normal route', () => {
      checkRecognize(
          [{
            path: 'p/:id',
            children: [{
              path: 'a/:name',
              children: [{
                path: 'b',
                component: ComponentB,
                children: [{path: 'c', component: ComponentC}]
              }]
            }]
          }],
          'p/11/a/victor/b/c', (s: RouterStateSnapshot) => {
            const p = s.firstChild(s.root);
            checkActivatedRoute(p, 'p/11', {id: '11'}, undefined);

            const a = s.firstChild(p);
            checkActivatedRoute(a, 'a/victor', {id: '11', name: 'victor'}, undefined);

            const b = s.firstChild(a);
            checkActivatedRoute(b, 'b', {id: '11', name: 'victor'}, ComponentB);

            const c = s.firstChild(b);
            checkActivatedRoute(c, 'c', {}, ComponentC);
          });
    });
  });

  describe('query parameters', () => {
    it('should support query params', () => {
      const config = [{path: 'a', component: ComponentA}];
      checkRecognize(config, 'a?q=11', (s: RouterStateSnapshot) => {
        expect(s.queryParams).toEqual({q: '11'});
      });
    });
  });

  describe('fragment', () => {
    it('should support fragment', () => {
      const config = [{path: 'a', component: ComponentA}];
      checkRecognize(
          config, 'a#f1', (s: RouterStateSnapshot) => { expect(s.fragment).toEqual('f1'); });
    });
  });

  describe('error handling', () => {
    it('should error when two routes with the same outlet name got matched', () => {
      recognize(
          RootComponent,
          [
            {path: 'a', component: ComponentA}, {path: 'b', component: ComponentB, outlet: 'aux'},
            {path: 'c', component: ComponentC, outlet: 'aux'}
          ],
          tree('a(aux:b//aux:c)'), 'a(aux:b//aux:c)')
          .subscribe((_) => {}, (s: RouterStateSnapshot) => {
            expect(s.toString())
                .toContain(
                    'Two segments cannot have the same outlet name: \'aux:b\' and \'aux:c\'.');
          });
    });

    it('should error when no matching routes', () => {
      recognize(RootComponent, [{path: 'a', component: ComponentA}], tree('invalid'), 'invalid')
          .subscribe((_) => {}, (s: RouterStateSnapshot) => {
            expect(s.toString()).toContain('Cannot match any routes');
          });
    });

    it('should error when no matching routes (too short)', () => {
      recognize(RootComponent, [{path: 'a/:id', component: ComponentA}], tree('a'), 'a')
          .subscribe((_) => {}, (s: RouterStateSnapshot) => {
            expect(s.toString()).toContain('Cannot match any routes');
          });
    });
  });
});

function checkRecognize(config: RouterConfig, url: string, callback: any): void {
  recognize(RootComponent, config, tree(url), url).subscribe(callback, e => { throw e; });
}

function checkActivatedRoute(
    actual: ActivatedRouteSnapshot, url: string, params: Params, cmp: Function,
    outlet: string = PRIMARY_OUTLET): void {
  if (actual === null) {
    expect(actual).not.toBeNull();
  } else {
    expect(actual.url.map(s => s.path).join('/')).toEqual(url);
    expect(actual.params).toEqual(params);
    expect(actual.component).toBe(cmp);
    expect(actual.outlet).toEqual(outlet);
  }
}

function tree(url: string): UrlTree {
  return new DefaultUrlSerializer().parse(url);
}

class RootComponent {}
class ComponentA {}
class ComponentB {}
class ComponentC {}
class ComponentD {}
class ComponentE {}
