// Backend polygon API가 준비되면 이 fixture를 API 응답으로 교체
import type { FeatureCollection, Geometry, MultiLineString } from "geojson"

export type SeoulDongProperties = {
  code: string
  name: string
  nameEng: string
  guCode: string
  guName: string
  baseYear: string
  centerLng: number
  centerLat: number
}

export type SeoulDongFeatureCollection = FeatureCollection<
  Geometry,
  SeoulDongProperties
>

export const seoulDongGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        code: "1123051",
        name: "신사동",
        nameEng: "Sinsa-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.022077,
        centerLat: 37.523073,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.0236688023869, 37.53273057382971],
            [127.03018252439756, 37.51678177148938],
            [127.02161856434614, 37.513416422499084],
            [127.01397119667513, 37.52503988289669],
            [127.02302831890559, 37.53231899582663],
            [127.0236688023869, 37.53273057382971],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123052",
        name: "논현1동",
        nameEng: "Nonhyeon 1(il)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.028816,
        centerLat: 37.509275,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.03018252439756, 37.51678177148938],
            [127.0360134845328, 37.504542767054886],
            [127.02657410782747, 37.50176795282692],
            [127.02245373407158, 37.508002078676576],
            [127.02161856434614, 37.513416422499084],
            [127.03018252439756, 37.51678177148938],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123053",
        name: "논현2동",
        nameEng: "Nonhyeon 2(i)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.038279,
        centerLat: 37.512323,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.03018252439756, 37.51678177148938],
            [127.04128354419875, 37.52010346103419],
            [127.04426529288817, 37.51461391134843],
            [127.04637616087683, 37.50642665161706],
            [127.0360134845328, 37.504542767054886],
            [127.03018252439756, 37.51678177148938],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123058",
        name: "삼성1동",
        nameEng: "Samseong 1(il)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.061475,
        centerLat: 37.513426,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.0690698130372, 37.522279423505026],
            [127.07057106587357, 37.50748081931759],
            [127.05879877483423, 37.504050964816194],
            [127.05237890906925, 37.51605001646398],
            [127.06737268086228, 37.5228018732759],
            [127.0690698130372, 37.522279423505026],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123059",
        name: "삼성2동",
        nameEng: "Samseong 2(i)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.051532,
        centerLat: 37.508938,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.04426529288817, 37.51461391134843],
            [127.05237890906925, 37.51605001646398],
            [127.05879877483423, 37.504050964816194],
            [127.05103593048881, 37.50182669060668],
            [127.04637616087683, 37.50642665161706],
            [127.04426529288817, 37.51461391134843],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123060",
        name: "대치1동",
        nameEng: "Daechi 1(il)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.061359,
        centerLat: 37.490472,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.05508059617965, 37.49354665411371],
            [127.06296770120233, 37.496068529964205],
            [127.06763773042414, 37.487263687924894],
            [127.05866574786786, 37.484875268285805],
            [127.05508059617965, 37.49354665411371],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123063",
        name: "대치4동",
        nameEng: "Daechi 4(sa)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.056126,
        centerLat: 37.498799,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.05879877483423, 37.504050964816194],
            [127.06296770120233, 37.496068529964205],
            [127.05508059617965, 37.49354665411371],
            [127.05461669063445, 37.49424887399282],
            [127.04928414981033, 37.50116986852596],
            [127.05103593048881, 37.50182669060668],
            [127.05879877483423, 37.504050964816194],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123064",
        name: "역삼1동",
        nameEng: "Yeoksam 1(il)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.038805,
        centerLat: 37.49658,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.04637616087683, 37.50642665161706],
            [127.05103593048881, 37.50182669060668],
            [127.04928414981033, 37.50116986852596],
            [127.0429937515614, 37.4896079199333],
            [127.03372770134304, 37.48673420790798],
            [127.02973923489684, 37.49515937670812],
            [127.02659989308502, 37.50171416311321],
            [127.02657410782747, 37.50176795282692],
            [127.0360134845328, 37.504542767054886],
            [127.04637616087683, 37.50642665161706],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123065",
        name: "역삼2동",
        nameEng: "Yeoksam 2(i)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.048805,
        centerLat: 37.495389,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.05461669063445, 37.49424887399282],
            [127.0487980642459, 37.491499814920594],
            [127.0429937515614, 37.4896079199333],
            [127.04928414981033, 37.50116986852596],
            [127.05461669063445, 37.49424887399282],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123066",
        name: "도곡1동",
        nameEng: "Dogok 1(il)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.041263,
        centerLat: 37.486629,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.0487980642459, 37.491499814920594],
            [127.04345123620755, 37.48276415595109],
            [127.03621915098798, 37.48175802427603],
            [127.03372770134304, 37.48673420790798],
            [127.0429937515614, 37.4896079199333],
            [127.0487980642459, 37.491499814920594],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123067",
        name: "도곡2동",
        nameEng: "Dogok 2(i)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.051058,
        centerLat: 37.485576,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.05508059617965, 37.49354665411371],
            [127.05866574786786, 37.484875268285805],
            [127.05862774489128, 37.48485501136302],
            [127.05383176381247, 37.482047981751535],
            [127.04604758022018, 37.476903515648424],
            [127.04345123620755, 37.48276415595109],
            [127.0487980642459, 37.491499814920594],
            [127.05461669063445, 37.49424887399282],
            [127.05508059617965, 37.49354665411371],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123068",
        name: "개포1동",
        nameEng: "Gaepo 1(il)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.062592,
        centerLat: 37.477445,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.05862774489128, 37.48485501136302],
            [127.07135137525977, 37.47107802023145],
            [127.06463901956462, 37.47003474490574],
            [127.05383176381247, 37.482047981751535],
            [127.05862774489128, 37.48485501136302],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123071",
        name: "개포4동",
        nameEng: "Gaepo 4(sa)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.055343,
        centerLat: 37.474864,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.05383176381247, 37.482047981751535],
            [127.06463901956462, 37.47003474490574],
            [127.05168651987388, 37.46767933933969],
            [127.04604758022018, 37.476903515648424],
            [127.05383176381247, 37.482047981751535],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123072",
        name: "일원본동",
        nameEng: "Irwonbon-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.087186,
        centerLat: 37.480366,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.0839105884464, 37.48586538552836],
            [127.09285661208187, 37.48853012296095],
            [127.09510067486981, 37.474453413329506],
            [127.08727101192895, 37.472465566199986],
            [127.0792709266303, 37.47220180263369],
            [127.07955765330033, 37.48431726402668],
            [127.0839105884464, 37.48586538552836],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123073",
        name: "일원1동",
        nameEng: "Irwon 1(il)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.093993,
        centerLat: 37.490267,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.0925798228796, 37.49466797489548],
            [127.0988509639092, 37.49302529254068],
            [127.104076240713, 37.4908320962496],
            [127.09285661208187, 37.48853012296095],
            [127.0839105884464, 37.48586538552836],
            [127.0925798228796, 37.49466797489548],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123074",
        name: "일원2동",
        nameEng: "Irwon 2(i)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.083262,
        centerLat: 37.491356,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.07759949729024, 37.49839572885325],
            [127.08573831212134, 37.49645940739078],
            [127.0925798228796, 37.49466797489548],
            [127.0839105884464, 37.48586538552836],
            [127.07955765330033, 37.48431726402668],
            [127.07394407641691, 37.490219908941526],
            [127.07759949729024, 37.49839572885325],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123075",
        name: "수서동",
        nameEng: "Suseo-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.103002,
        centerLat: 37.482643,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.104076240713, 37.4908320962496],
            [127.11025761076787, 37.48649739956609],
            [127.11314705595287, 37.480127870880345],
            [127.09510067486981, 37.474453413329506],
            [127.09285661208187, 37.48853012296095],
            [127.104076240713, 37.4908320962496],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123076",
        name: "세곡동",
        nameEng: "Segok-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.105838,
        centerLat: 37.467956,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.11314705595287, 37.480127870880345],
            [127.12440571080893, 37.46240445587048],
            [127.11885903757606, 37.45578434878651],
            [127.09842759318751, 37.45862253857461],
            [127.08727101192895, 37.472465566199986],
            [127.09510067486981, 37.474453413329506],
            [127.11314705595287, 37.480127870880345],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123077",
        name: "압구정동",
        nameEng: "Apgujeong-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.035868,
        centerLat: 37.526255,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.03038815978167, 37.5357278833247],
            [127.04806779588436, 37.52970198575087],
            [127.04128354419875, 37.52010346103419],
            [127.03018252439756, 37.51678177148938],
            [127.0236688023869, 37.53273057382971],
            [127.02780424413358, 37.53506389757521],
            [127.03038815978167, 37.5357278833247],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123078",
        name: "청담동",
        nameEng: "Cheongdam-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.054328,
        centerLat: 37.522183,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.05116490008963, 37.52975116557232],
            [127.05867359288398, 37.52629974922568],
            [127.06737268086228, 37.5228018732759],
            [127.05237890906925, 37.51605001646398],
            [127.04426529288817, 37.51461391134843],
            [127.04128354419875, 37.52010346103419],
            [127.04806779588436, 37.52970198575087],
            [127.05116490008963, 37.52975116557232],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123079",
        name: "대치2동",
        nameEng: "Daechi 2(i)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.068199,
        centerLat: 37.497372,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.07091156739416, 37.50719902959034],
            [127.07528960655267, 37.49932614743975],
            [127.07759949729024, 37.49839572885325],
            [127.07394407641691, 37.490219908941526],
            [127.06763773042414, 37.487263687924894],
            [127.06296770120233, 37.496068529964205],
            [127.05879877483423, 37.504050964816194],
            [127.07057106587357, 37.50748081931759],
            [127.07091156739416, 37.50719902959034],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        code: "1123080",
        name: "개포2동",
        nameEng: "Gaepo 2(i)-dong",
        guCode: "11230",
        guName: "강남구",
        baseYear: "2013",
        centerLng: 127.069093,
        centerLat: 37.480649,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [127.07394407641691, 37.490219908941526],
            [127.07955765330033, 37.48431726402668],
            [127.0792709266303, 37.47220180263369],
            [127.07135137525977, 37.47107802023145],
            [127.05862774489128, 37.48485501136302],
            [127.05866574786786, 37.484875268285805],
            [127.06763773042414, 37.487263687924894],
            [127.07394407641691, 37.490219908941526],
          ],
        ],
      },
    },
  ],
} as const satisfies SeoulDongFeatureCollection

// 백엔드 연결 시 행정동 polygon과 구 boundary GeoJSON을 각각 받고 아래의 프론트 구 경계 생성 로직 제거
type SeoulGuBoundaryProperties = {
  guCode: string
  guName: string
}

type Segment = [[number, number], [number, number]]
type LinearRing = readonly (readonly number[])[]

type SegmentRecord = {
  coordinates: Segment
  count: number
}

type GuBoundaryAccumulator = SeoulGuBoundaryProperties & {
  segments: Map<string, SegmentRecord>
}

type SeoulGuBoundaryFeatureCollection = FeatureCollection<
  MultiLineString,
  SeoulGuBoundaryProperties
>

const toPosition = (coordinate: readonly number[]) =>
  [coordinate[0] ?? 0, coordinate[1] ?? 0] satisfies [number, number]

const getCoordinateKey = ([lng, lat]: [number, number]) => `${lng},${lat}`

const getSegmentKey = (start: [number, number], end: [number, number]) => {
  const startKey = getCoordinateKey(start)
  const endKey = getCoordinateKey(end)

  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`
}

const getPolygonRings = (geometry: Geometry): LinearRing[] => {
  if (geometry.type === "Polygon") {
    return geometry.coordinates
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flat()
  }

  return []
}

const addRingSegments = (
  accumulator: GuBoundaryAccumulator,
  ring: LinearRing
) => {
  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = toPosition(ring[index] ?? [])
    const end = toPosition(ring[index + 1] ?? [])
    const segmentKey = getSegmentKey(start, end)
    const existingSegment = accumulator.segments.get(segmentKey)

    if (existingSegment) {
      existingSegment.count += 1
      continue
    }

    accumulator.segments.set(segmentKey, {
      coordinates: [start, end],
      count: 1,
    })
  }
}

const createGuBoundaryMap = () => {
  const guBoundaryMap = new Map<string, GuBoundaryAccumulator>()

  seoulDongGeoJson.features.forEach((feature) => {
    const { guCode, guName } = feature.properties
    const accumulator = guBoundaryMap.get(guCode) ?? {
      guCode,
      guName,
      segments: new Map<string, SegmentRecord>(),
    }

    getPolygonRings(feature.geometry).forEach((ring) => {
      addRingSegments(accumulator, ring)
    })
    guBoundaryMap.set(guCode, accumulator)
  })

  return guBoundaryMap
}

const createSeoulGuBoundaryGeoJson = (): SeoulGuBoundaryFeatureCollection => {
  const guBoundaryMap = createGuBoundaryMap()

  return {
    type: "FeatureCollection",
    features: Array.from(guBoundaryMap.values()).map((guBoundary) => ({
      type: "Feature",
      properties: {
        guCode: guBoundary.guCode,
        guName: guBoundary.guName,
      },
      geometry: {
        type: "MultiLineString",
        coordinates: Array.from(guBoundary.segments.values())
          .filter((segment) => segment.count === 1)
          .map((segment) => segment.coordinates),
      },
    })),
  }
}

export const seoulGuBoundaryGeoJson = createSeoulGuBoundaryGeoJson()
