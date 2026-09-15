import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { StyleSheet, View } from 'react-native'
import type { CameraRef } from '@maplibre/maplibre-react-native'

import { MapAttribution } from '@/components/maps/MapAttribution'
import type { ArenaMapCameraTransition } from '@/lib/arena-map/arenaMapPresentation'
import { arenaMapMarkerRenderModel } from '@/lib/arena-map/arenaMapPresentation'
import { DEFAULT_MAP_STYLE_ID, getArena3dStyleUrl, getStyleAttribution } from '@/lib/maps/mapLibreConfig'
import type { ArenaMapPinSummary } from '@/types/arenaMap'

import { ArenaMapCluster } from './ArenaMapCluster'
import { ArenaMapPin } from './ArenaMapPin'

type MapModule = {
  Camera: ComponentType<any>
  Marker: ComponentType<any>
  Map: ComponentType<any>
}

export type ArenaMapRegionEvent = { bounds?: unknown; zoom?: number }

type MapLibreArenaMapViewProps = {
  pins: ArenaMapPinSummary[]
  selectedId: string | null
  camera: ArenaMapCameraTransition
  onPinPress: (pinId: string) => void
  onClusterPress: (coordinate: ArenaMapPinSummary['coordinate']) => void
  onRegionChange: (event: ArenaMapRegionEvent) => void
  onUnavailable: () => void
}

export function MapLibreArenaMapView({
  pins,
  selectedId,
  camera,
  onPinPress,
  onClusterPress,
  onRegionChange,
  onUnavailable,
}: MapLibreArenaMapViewProps) {
  const cameraRef = useRef<CameraRef | null>(null)
  const onUnavailableRef = useRef(onUnavailable)
  onUnavailableRef.current = onUnavailable
  const [nativeMap, setNativeMap] = useState<MapModule | null>(null)
  const [zoom, setZoom] = useState(camera.zoom)
  const mapStyle = useMemo(() => getArena3dStyleUrl(), [])
  const markerModel = useMemo(
    () => arenaMapMarkerRenderModel(zoom, pins, selectedId),
    [pins, selectedId, zoom],
  )

  useEffect(() => {
    let active = true
    import('@maplibre/maplibre-react-native')
      .then((module) => {
        if (active) setNativeMap({ Camera: module.Camera, Marker: module.Marker, Map: module.Map })
      })
      .catch(() => {
        if (active) onUnavailableRef.current()
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!nativeMap) return
    const options = {
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      padding: camera.padding,
    }
    if (camera.duration === 0) cameraRef.current?.jumpTo(options)
    else cameraRef.current?.easeTo({ ...options, duration: camera.duration })
  }, [camera, nativeMap])

  if (!nativeMap) return <View style={styles.map} />
  const { Map, Camera, Marker } = nativeMap

  return <View style={styles.root}>
    <Map
      style={styles.map}
      mapStyle={mapStyle}
      logo={false}
      attribution={false}
      compass={false}
      rotateEnabled={false}
      pitchEnabled
      onRegionDidChange={(event: { nativeEvent?: ArenaMapRegionEvent }) => {
        const next = event.nativeEvent ?? {}
        if (typeof next.zoom === 'number') setZoom(next.zoom)
        onRegionChange(next)
      }}
    >
      <Camera
        ref={cameraRef}
        initialViewState={{
          center: camera.center,
          zoom: camera.zoom,
          pitch: camera.pitch,
          bearing: camera.bearing,
        }}
      />
      {markerModel.clusters.map((cluster) => <Marker
        key={cluster.id}
        id={cluster.id}
        lngLat={[cluster.coordinate.longitude, cluster.coordinate.latitude]}
        anchor="center"
      >
        <ArenaMapCluster
          count={cluster.count}
          typeMix={cluster.typeMix}
          onPress={() => onClusterPress(cluster.coordinate)}
        />
      </Marker>)}
      {markerModel.unclusteredPins.map((pin) => <Marker
        key={pin.id}
        id={`arena-map-${pin.id}`}
        lngLat={[pin.coordinate.longitude, pin.coordinate.latitude]}
        anchor="bottom"
      >
        <ArenaMapPin pin={pin} selected={false} onPress={() => onPinPress(pin.id)} />
      </Marker>)}
      {markerModel.selectedPin ? <Marker
        id={`arena-map-selected-${markerModel.selectedPin.id}`}
        lngLat={[markerModel.selectedPin.coordinate.longitude, markerModel.selectedPin.coordinate.latitude]}
        anchor="bottom"
        style={{ zIndex: 2 }}
      >
        <ArenaMapPin
          pin={markerModel.selectedPin}
          selected
          onPress={() => onPinPress(markerModel.selectedPin!.id)}
        />
      </Marker> : null}
    </Map>
    <MapAttribution attribution={getStyleAttribution(DEFAULT_MAP_STYLE_ID)} />
  </View>
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  map: { ...StyleSheet.absoluteFillObject },
})
