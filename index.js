var THREE = window.three = require('three')
var raf = require('raf')
var container
var output = document.querySelector('#output')
var camera, renderer, brush
var projector, plane
var mouse2D, mouse3D, raycaster, objectHovered
var isShiftDown = false, isCtrlDown = false, isMouseDown = false, isAltDown = false
var onMouseDownPosition = new THREE.Vector2(), onMouseDownPhi = 60, onMouseDownTheta = 45
var radius = 1600, theta = 90, phi = 60
target = new THREE.Vector3( 0, 200, 0 )
window.color = 0
var CubeMaterial = THREE.MeshBasicMaterial
var wireframe = true, fill = true

$('.color-picker .btn').click(function(e) {
  var target = $(e.currentTarget)
  var idx = +target.find('.color').attr('data-color')
  color = idx
  brush.material.color.setRGB(colors[idx][0], colors[idx][1], colors[idx][2])
})

$('.toggle input').click(function(e) {
  // setTimeout ensures this fires after the input value changes
  setTimeout(function() {
    var el = $(e.target).parent()
    var state = !el.hasClass('toggle-off')
    window[el.attr('data-action')](state)
  }, 0)
})

window.setWireframe = function(bool) {
  wireframe = bool
  scene.children
    .filter(function(el) { return el.isVoxel })
    .map(function(mesh) { mesh.children[1].visible = bool })
}

window.setFill = function(bool) {
  fill = bool
  scene.children
    .filter(function(el) { return el.isVoxel })
    .map(function(mesh) { mesh.children[0].material.visible = bool })
}

window.showGrid = function(bool) {
  grid.material.visible = bool
}

window.setShadows = function(bool) {
  if (bool) CubeMaterial = THREE.MeshLambertMaterial
  else CubeMaterial = THREE.MeshBasicMaterial
  scene.children
    .filter(function(el) { return el !== brush && el.isVoxel })
    .map(function(cube) { scene.remove(cube) })
  buildFromHash()
}

function addVoxel() {
  if (brush.position.y === 2000) return
  var materials = [
    new CubeMaterial( { vertexColors: THREE.VertexColors } ),
    new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } )
  ]
  materials[0].color.setRGB( colors[color][0], colors[color][1], colors[color][2] )
  var voxel = THREE.SceneUtils.createMultiMaterialObject( cube, materials )
  voxel.isVoxel = true
  voxel.overdraw = true
  voxel.position.copy(brush.position)
  voxel.matrixAutoUpdate = false
  voxel.updateMatrix()
  scene.add( voxel )
}

function v2h(value) {
  value = parseInt(value).toString(16)
  return value.length < 2 ? value + "0" : value
}
function rgb2hex(rgb) {
  if (rgb.match(/^rgb/) == null) return rgb
  var arr = rgb.match(/\d+/g)
  return v2h(arr[0]) + v2h(arr[1]) + v2h(arr[2])
}

function scale( x, fromLow, fromHigh, toLow, toHigh ) {
  return ( x - fromLow ) * ( toHigh - toLow ) / ( fromHigh - fromLow ) + toLow
}

var colors = Array.prototype.slice.call(document.querySelectorAll('.color')).map(function(el) {
  var rgb = getComputedStyle(el).backgroundColor
  return rgb.match(/\d+/g).map(function(num) { return scale(num, 0, 255, 0, 1) })
})

var cube = new THREE.CubeGeometry( 50, 50, 50 )

init()
raf(window).on('data', render)

function init() {

  container = document.createElement( 'div' )
  document.body.appendChild( container )

  camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 )
  camera.position.x = radius * Math.sin( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 )
  camera.position.y = radius * Math.sin( phi * Math.PI / 360 )
  camera.position.z = radius * Math.cos( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 )

  window.scene = new THREE.Scene()

  // Grid

  var size = 500, step = 50

  var geometry = new THREE.Geometry()

  for ( var i = - size; i <= size; i += step ) {

    geometry.vertices.push( new THREE.Vector3( - size, 0, i ) )
    geometry.vertices.push( new THREE.Vector3(   size, 0, i ) )

    geometry.vertices.push( new THREE.Vector3( i, 0, - size ) )
    geometry.vertices.push( new THREE.Vector3( i, 0,   size ) )

  }

  var material = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 0.2 } )

  var line = new THREE.Line( geometry, material )
  line.type = THREE.LinePieces
  window.grid = line
  scene.add( line )

  // Plane

  projector = new THREE.Projector()

  plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshBasicMaterial() )
  plane.rotation.x = - Math.PI / 2
  plane.visible = false
  scene.add( plane )

  mouse2D = new THREE.Vector3( 0, 10000, 0.5 )

  // Brush
  var brushMaterials = [
    new CubeMaterial( { vertexColors: THREE.VertexColors, opacity: 0.5 } ),
    new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } )
  ]
  brushMaterials[0].color.setRGB(colors[0][0], colors[0][1], colors[0][2])
  brush = THREE.SceneUtils.createMultiMaterialObject( cube, brushMaterials )
  brush.isBrush = true
  brush.position.y = 2000
  brush.overdraw = true
  scene.add( brush )

  // Lights

  var ambientLight = new THREE.AmbientLight( 0x606060 )
  scene.add( ambientLight )

  var directionalLight = new THREE.DirectionalLight( 0xffffff )
  directionalLight.position.x = Math.random() - 0.5
  directionalLight.position.y = Math.random() - 0.5
  directionalLight.position.z = Math.random() - 0.5
  directionalLight.position.normalize()
  scene.add( directionalLight )

  var directionalLight = new THREE.DirectionalLight( 0x808080 )
  directionalLight.position.x = Math.random() - 0.5
  directionalLight.position.y = Math.random() - 0.5
  directionalLight.position.z = Math.random() - 0.5
  directionalLight.position.normalize()
  scene.add( directionalLight )

  renderer = new THREE.CanvasRenderer()
  renderer.setSize( window.innerWidth, window.innerHeight )

  container.appendChild(renderer.domElement)

  renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false )
  renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false )
  renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false )
  document.addEventListener( 'keydown', onDocumentKeyDown, false )
  document.addEventListener( 'keyup', onDocumentKeyUp, false )

  //

  window.addEventListener( 'resize', onWindowResize, false )
  
  if ( window.location.hash ) buildFromHash()

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize( window.innerWidth, window.innerHeight )

}

function getIntersecting() {
  var intersectable = scene.children.map(function(c) { if (c.isVoxel) return c.children[0]; return c; })
  var intersections = raycaster.intersectObjects( intersectable )
  if (intersections.length > 0) {
    var intersect = intersections[ 0 ].object.isBrush ? intersections[ 1 ] : intersections[ 0 ]
    return intersect
  }
}

function interact() {
  if (typeof raycaster === 'undefined') return

  if ( objectHovered ) {
    objectHovered.material.opacity = 1
    objectHovered = null
  }
  
  var intersect = getIntersecting()

  if ( intersect ) {
    var normal = intersect.face.normal.clone()
    normal.applyMatrix4( intersect.object.matrixRotationWorld )
    var position = new THREE.Vector3().addVectors( intersect.point, normal )
    var newCube = [Math.floor( position.x / 50 ), Math.floor( position.y / 50 ), Math.floor( position.z / 50 )]
    
    function updateBrush() {
      brush.position.x = Math.floor( position.x / 50 ) * 50 + 25
      brush.position.y = Math.floor( position.y / 50 ) * 50 + 25
      brush.position.z = Math.floor( position.z / 50 ) * 50 + 25
    }
    
    if (isAltDown) {
      if (!brush.currentCube) brush.currentCube = newCube
      if (brush.currentCube.join('') !== newCube.join('')) {
        if ( isShiftDown ) {
          if ( intersect.object !== plane ) {
            scene.remove( intersect.object.parent )
          }
        } else {
          addVoxel()
        }
      }
      updateBrush()
      updateHash()
      return brush.currentCube = newCube
    } else if ( isShiftDown ) {
      if ( intersect.object !== plane ) {
        objectHovered = intersect.object
        objectHovered.material.opacity = 0.5
        return
      }
    } else {
      updateBrush()
      return
    }
  }
  brush.position.y = 2000
}

function onDocumentMouseMove( event ) {

  event.preventDefault()
  
  if ( isMouseDown ) {

    theta = - ( ( event.clientX - onMouseDownPosition.x ) * 0.5 ) + onMouseDownTheta
    phi = ( ( event.clientY - onMouseDownPosition.y ) * 0.5 ) + onMouseDownPhi

    phi = Math.min( 180, Math.max( 0, phi ) )

    camera.position.x = radius * Math.sin( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 )
    camera.position.y = radius * Math.sin( phi * Math.PI / 360 )
    camera.position.z = radius * Math.cos( theta * Math.PI / 360 ) * Math.cos( phi * Math.PI / 360 )
    camera.updateMatrix()

  }

  mouse2D.x = ( event.clientX / window.innerWidth ) * 2 - 1
  mouse2D.y = - ( event.clientY / window.innerHeight ) * 2 + 1

  interact()
}

function onDocumentMouseDown( event ) {
  event.preventDefault()
  isMouseDown = true
  onMouseDownTheta = theta
  onMouseDownPhi = phi
  onMouseDownPosition.x = event.clientX
  onMouseDownPosition.y = event.clientY
}

function onDocumentMouseUp( event ) {
  event.preventDefault()
  isMouseDown = false
  onMouseDownPosition.x = event.clientX - onMouseDownPosition.x
  onMouseDownPosition.y = event.clientY - onMouseDownPosition.y
  
  if ( onMouseDownPosition.length() > 5 ) return
  
  var intersect = getIntersecting()
  
  if ( intersect ) {

    if ( isShiftDown ) {

      if ( intersect.object != plane ) {

        scene.remove( intersect.object.parent )

      }
    } else {
      addVoxel()
    }

  }

  
  updateHash()
  render()
  interact()
}

function onDocumentKeyDown( event ) {
  
  switch( event.keyCode ) {
    
    case 16: isShiftDown = true; break
    case 17: isCtrlDown = true; break
    case 18: isAltDown = true; break
    
  }

}

function onDocumentKeyUp( event ) {

  switch( event.keyCode ) {

    case 16: isShiftDown = false; break
    case 17: isCtrlDown = false; break
    case 18: isAltDown = false; break

  }
}


function buildFromHash() {

  var hash = window.location.hash.substr( 1 ),
  version = hash.substr( 0, 2 )

  if ( version == "A/" ) {

    var current = { x: 0, y: 0, z: 0, c: 0 }
    var data = decode( hash.substr( 2 ) )
    var i = 0, l = data.length

    while ( i < l ) {

      var code = data[ i ++ ].toString( 2 )
      if ( code.charAt( 1 ) == "1" ) current.x += data[ i ++ ] - 32
      if ( code.charAt( 2 ) == "1" ) current.y += data[ i ++ ] - 32
      if ( code.charAt( 3 ) == "1" ) current.z += data[ i ++ ] - 32
      if ( code.charAt( 4 ) == "1" ) current.c += data[ i ++ ] - 32
      if ( code.charAt( 0 ) == "1" ) {
        var materials = [
          new CubeMaterial( { vertexColors: THREE.VertexColors } ),
          new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } )
        ]
        var col = colors[current.c] || colors[0]
        materials[0].color.setRGB( col[0], col[1], col[2] )
        var voxel = THREE.SceneUtils.createMultiMaterialObject( cube, materials )
        voxel.isVoxel = true
        voxel.position.x = current.x * 50 + 25
        voxel.position.y = current.y * 50 + 25
        voxel.position.z = current.z * 50 + 25
        voxel.overdraw = true
        scene.add( voxel )
      }
    }

  }

  updateHash()

}

function updateHash() {

  var data = [], voxels = [], code
  var current = { x: 0, y: 0, z: 0, c: 0 }
  var last = { x: 0, y: 0, z: 0, c: 0 }
  for ( var i in scene.children ) {

    var object = scene.children[ i ]

    if ( object.isVoxel && object !== plane && object !== brush ) {

      current.x = ( object.position.x - 25 ) / 50
      current.y = ( object.position.y - 25 ) / 50
      current.z = ( object.position.z - 25 ) / 50
      
      var colorString = ['r', 'g', 'b'].map(function(col) { return object.children[0].material.color[col] }).join('')
      for (var i = 0; i < colors.length; i++) if (colors[i].join('') === colorString) current.c = i
      voxels.push({x: current.x, y: current.y + 1, z: current.z , c: current.c + 1})
      
      code = 0

      if ( current.x != last.x ) code += 1000
      if ( current.y != last.y ) code += 100
      if ( current.z != last.z ) code += 10
      if ( current.c != last.c ) code += 1

      code += 10000

      data.push( parseInt( code, 2 ) )

      if ( current.x != last.x ) {

        data.push( current.x - last.x + 32 )
        last.x = current.x

      }

      if ( current.y != last.y ) {

        data.push( current.y - last.y + 32 )
        last.y = current.y

      }

      if ( current.z != last.z ) {

        data.push( current.z - last.z + 32 )
        last.z = current.z

      }

      if ( current.c != last.c ) {

        data.push( current.c - last.c + 32 )
        last.c = current.c

      }

    }

  }
  // if (voxels.length > 0) updateFunction(voxels)
  data = encode( data )
  window.location.hash = "A/" + data
}

function updateFunction(voxels) {
  var dimensions = getDimensions(voxels)
  voxels = voxels.map(function(v) { return [v.x, v.y, v.z, v.c]})
  var funcString = "var voxels = " + JSON.stringify(voxels) + "<br>"
  funcString += 'var dimensions = ' + JSON.stringify(dimensions) + '<br>'
  funcString += 'var size = game.cubeSize<br>'
  funcString += 'voxels.map(function(voxel) {<br>' +
    '&nbsp;&nbsp;game.setBlock({x: position.x + voxel[0] * size, y: position.y + voxel[1] * size, z: position.z + voxel[2] * size}, voxel[3])<br>' +
  '})'
  output.innerHTML = funcString
}

function getDimensions(voxels) {
  var low = [0, 0, 0], high = [0, 0, 0]
  voxels.map(function(voxel) {
    if (voxel.x < low[0]) low[0] = voxel.x
    if (voxel.x > high[0]) high[0] = voxel.x
    if (voxel.y < low[1]) low[1] = voxel.y
    if (voxel.y > high[1]) high[1] = voxel.y
    if (voxel.z < low[2]) low[2] = voxel.z
    if (voxel.z > high[2]) high[2] = voxel.z
  })
  return [ high[0]-low[0], high[1]-low[1], high[2]-low[2] ]
}

// https://gist.github.com/665235

function decode( string ) {

  var output = []
  string.split('').forEach( function ( v ) { output.push( "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf( v ) ) } )
  return output

}

function encode( array ) {

  var output = ""
  array.forEach( function ( v ) { output += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt( v ) } )
  return output

}

function save() {

  window.open( renderer.domElement.toDataURL('image/png'), 'mywindow' )

}

function render() {
  camera.lookAt( target )
  raycaster = projector.pickingRay( mouse2D.clone(), camera )
  renderer.render( scene, camera )
}