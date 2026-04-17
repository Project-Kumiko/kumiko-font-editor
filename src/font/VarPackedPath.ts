// 從 Fontra 移植的 VarPackedPath
// 字體路徑資料結構，支援 Variable Fonts

export const POINT_TYPE_ON_CURVE = 0x00
export const POINT_TYPE_OFF_CURVE_QUAD = 0x01
export const POINT_TYPE_OFF_CURVE_CUBIC = 0x02
export const POINT_SMOOTH_FLAG = 0x08
export const POINT_TYPE_MASK = 0x07

export interface ContourInfo {
  endPoint: number
  isClosed?: boolean
}

export interface Point {
  x: number
  y: number
  type?: 'onCurve' | 'offCurveQuad' | 'offCurveCubic'
  smooth?: boolean
}

export interface UnpackedContour {
  points: Point[]
  isClosed: boolean
}

export interface Segment {
  points: Point[]
  pointIndices: number[]
  type?: 'line' | 'quad' | 'cubic' | 'quadBlob'
}

export class VarPackedPath {
  coordinates: Float64Array
  pointTypes: Uint8Array
  contourInfo: ContourInfo[]

  constructor(
    coordinates?: Float64Array,
    pointTypes?: Uint8Array,
    contourInfo?: ContourInfo[]
  ) {
    this.coordinates = coordinates ?? new Float64Array(0)
    this.pointTypes = pointTypes ?? new Uint8Array(0)
    this.contourInfo = contourInfo ?? []
  }

  static fromObject(obj: {
    coordinates: number[]
    pointTypes: number[]
    contourInfo: ContourInfo[]
  }): VarPackedPath {
    return new VarPackedPath(
      new Float64Array(obj.coordinates),
      new Uint8Array(obj.pointTypes),
      obj.contourInfo.map((info) => ({ ...info }))
    )
  }

  static fromUnpackedContours(unpackedContours: UnpackedContour[]): VarPackedPath {
    const path = new VarPackedPath()
    for (const contour of unpackedContours) {
      path.appendUnpackedContour(contour)
    }
    return path
  }

  get numContours(): number {
    return this.contourInfo.length
  }

  get numPoints(): number {
    return this.pointTypes.length
  }

  getNumPointsOfContour(contourIndex: number): number {
    const normalizedIndex = this._normalizeContourIndex(contourIndex)
    const startPoint = this._getContourStartPoint(normalizedIndex)
    const info = this.contourInfo[normalizedIndex]
    return info.endPoint + 1 - startPoint
  }

  getPoint(index: number): Point {
    const i2 = index * 2
    const type = this.pointTypes[index] & POINT_TYPE_MASK
    const smooth = !!(this.pointTypes[index] & POINT_SMOOTH_FLAG)

    return {
      x: this.coordinates[i2],
      y: this.coordinates[i2 + 1],
      type:
        type === POINT_TYPE_ON_CURVE
          ? 'onCurve'
          : type === POINT_TYPE_OFF_CURVE_QUAD
          ? 'offCurveQuad'
          : 'offCurveCubic',
      smooth,
    }
  }

  setPoint(index: number, point: Point) {
    const i2 = index * 2
    this.coordinates[i2] = point.x
    this.coordinates[i2 + 1] = point.y

    // Update type
    let type = POINT_TYPE_ON_CURVE
    if (point.type === 'offCurveQuad') {
      type = POINT_TYPE_OFF_CURVE_QUAD
    } else if (point.type === 'offCurveCubic') {
      type = POINT_TYPE_OFF_CURVE_CUBIC
    }

    if (point.smooth) {
      type |= POINT_SMOOTH_FLAG
    }

    this.pointTypes[index] = type
  }

  getContourAndPointIndex(pointIndex: number): [number, number] {
    let contourIndex = 0
    while (
      contourIndex < this.contourInfo.length &&
      this.contourInfo[contourIndex].endPoint < pointIndex
    ) {
      contourIndex++
    }

    if (contourIndex >= this.contourInfo.length) {
      return [-1, -1]
    }

    const contourPointIndex = pointIndex - this._getContourStartPoint(contourIndex)
    return [contourIndex, contourPointIndex]
  }

  getContourPoint(contourIndex: number, contourPointIndex: number): Point {
    const normalizedIndex = this._normalizeContourIndex(contourIndex)
    const startPoint = this._getContourStartPoint(normalizedIndex)
    return this.getPoint(startPoint + contourPointIndex)
  }

  appendUnpackedContour(contour: UnpackedContour) {
    const startPoint = this.numPoints
    const numPoints = contour.points.length

    // Extend arrays
    const newCoords = new Float64Array(this.coordinates.length + numPoints * 2)
    newCoords.set(this.coordinates)
    this.coordinates = newCoords

    const newTypes = new Uint8Array(this.pointTypes.length + numPoints)
    newTypes.set(this.pointTypes)
    this.pointTypes = newTypes

    // Add points
    for (let i = 0; i < numPoints; i++) {
      const point = contour.points[i]
      const idx = startPoint + i

      this.coordinates[idx * 2] = point.x
      this.coordinates[idx * 2 + 1] = point.y

      let type = POINT_TYPE_ON_CURVE
      if (point.type === 'offCurveQuad') {
        type = POINT_TYPE_OFF_CURVE_QUAD
      } else if (point.type === 'offCurveCubic') {
        type = POINT_TYPE_OFF_CURVE_CUBIC
      }

      if (point.smooth) {
        type |= POINT_SMOOTH_FLAG
      }

      this.pointTypes[idx] = type
    }

    // Add contour info
    this.contourInfo.push({
      endPoint: startPoint + numPoints - 1,
      isClosed: contour.isClosed,
    })
  }

  deleteContour(contourIndex: number) {
    const normalizedIndex = this._normalizeContourIndex(contourIndex)
    const startPoint = this._getContourStartPoint(normalizedIndex)
    const endPoint = this.contourInfo[normalizedIndex].endPoint
    const numPoints = endPoint - startPoint + 1

    // Remove from coordinates and pointTypes
    const newCoords = new Float64Array(this.coordinates.length - numPoints * 2)
    const newTypes = new Uint8Array(this.pointTypes.length - numPoints)

    // Copy before
    newCoords.set(this.coordinates.slice(0, startPoint * 2))
    newTypes.set(this.pointTypes.slice(0, startPoint))

    // Copy after
    newCoords.set(
      this.coordinates.slice((endPoint + 1) * 2),
      startPoint * 2
    )
    newTypes.set(this.pointTypes.slice(endPoint + 1), startPoint)

    this.coordinates = newCoords
    this.pointTypes = newTypes

    // Update contour info
    this.contourInfo.splice(normalizedIndex, 1)

    // Update endPoints for subsequent contours
    for (let i = normalizedIndex; i < this.contourInfo.length; i++) {
      this.contourInfo[i].endPoint -= numPoints
    }
  }

  insertPoint(contourIndex: number, contourPointIndex: number, point: Point) {
    const normalizedIndex = this._normalizeContourIndex(contourIndex)
    const startPoint = this._getContourStartPoint(normalizedIndex)
    const insertIndex = startPoint + contourPointIndex

    // Extend arrays
    const newCoords = new Float64Array(this.coordinates.length + 2)
    const newTypes = new Uint8Array(this.pointTypes.length + 1)

    // Copy before
    newCoords.set(this.coordinates.slice(0, insertIndex * 2))
    newTypes.set(this.pointTypes.slice(0, insertIndex))

    // Copy after
    newCoords.set(
      this.coordinates.slice(insertIndex * 2),
      (insertIndex + 1) * 2
    )
    newTypes.set(this.pointTypes.slice(insertIndex), insertIndex + 1)

    // Set new point
    newCoords[insertIndex * 2] = point.x
    newCoords[insertIndex * 2 + 1] = point.y

    let type = POINT_TYPE_ON_CURVE
    if (point.type === 'offCurveQuad') {
      type = POINT_TYPE_OFF_CURVE_QUAD
    } else if (point.type === 'offCurveCubic') {
      type = POINT_TYPE_OFF_CURVE_CUBIC
    }
    if (point.smooth) {
      type |= POINT_SMOOTH_FLAG
    }
    newTypes[insertIndex] = type

    this.coordinates = newCoords
    this.pointTypes = newTypes

    // Update endPoints for this and subsequent contours
    for (let i = normalizedIndex; i < this.contourInfo.length; i++) {
      this.contourInfo[i].endPoint++
    }
  }

  deletePoint(pointIndex: number) {
    const [contourIndex] = this.getContourAndPointIndex(pointIndex)
    if (contourIndex < 0) return

    // Remove from arrays
    const newCoords = new Float64Array(this.coordinates.length - 2)
    const newTypes = new Uint8Array(this.pointTypes.length - 1)

    newCoords.set(this.coordinates.slice(0, pointIndex * 2))
    newTypes.set(this.pointTypes.slice(0, pointIndex))

    newCoords.set(this.coordinates.slice((pointIndex + 1) * 2), pointIndex * 2)
    newTypes.set(this.pointTypes.slice(pointIndex + 1), pointIndex)

    this.coordinates = newCoords
    this.pointTypes = newTypes

    // Update contour info
    for (let i = contourIndex; i < this.contourInfo.length; i++) {
      this.contourInfo[i].endPoint--
    }
  }

  // Iterator methods

  *iterContours(): Generator<{ points: Point[]; isClosed: boolean }, void> {
    let startPoint = 0
    for (const info of this.contourInfo) {
      const points: Point[] = []
      for (let i = startPoint; i <= info.endPoint; i++) {
        points.push(this.getPoint(i))
      }
      yield { points, isClosed: info.isClosed ?? true }
      startPoint = info.endPoint + 1
    }
  }

  *iterPoints(): Generator<Point & { index: number }, void> {
    for (let i = 0; i < this.numPoints; i++) {
      yield { ...this.getPoint(i), index: i }
    }
  }

  *iterHandles(): Generator<[Point, Point], void> {
    for (const contour of this.iterContours()) {
      const { points, isClosed } = contour
      if (points.length < 2) continue

      for (let i = 0; i < points.length; i++) {
        const point = points[i]
        if (point.type !== 'onCurve') continue

        const nextIndex = (i + 1) % points.length
        const nextPoint = points[nextIndex]

        if (!isClosed && i === points.length - 1) continue

        // Check for off-curve handles
        if (nextPoint.type === 'offCurveQuad' || nextPoint.type === 'offCurveCubic') {
          yield [point, nextPoint]
        }
      }
    }
  }

  *iterContourSegments(contourIndex: number): Generator<Segment, void> {
    const normalizedIndex = this._normalizeContourIndex(contourIndex)
    const startPoint = this._getContourStartPoint(normalizedIndex)
    const contour = this.contourInfo[normalizedIndex]

    for (const segment of this._iterDecomposedSegments(
      startPoint,
      contour.endPoint,
      contour.isClosed ?? true
    )) {
      yield {
        type: segment.type,
        points: coordinatesToPoints(segment.coordinates),
        pointIndices: segment.pointIndices,
      }
    }
  }

  getControlBounds(): Rect | undefined {
    return this._getControlBounds(0, this.numPoints - 1)
  }

  getControlBoundsForContour(contourIndex: number): Rect | undefined {
    const normalizedIndex = this._normalizeContourIndex(contourIndex)
    const startPoint = this._getContourStartPoint(normalizedIndex)
    return this._getControlBounds(startPoint, this.contourInfo[normalizedIndex].endPoint)
  }

  private _getControlBounds(startPoint: number, endPoint: number): Rect | undefined {
    const startIndex = startPoint * 2
    const endIndex = (endPoint + 1) * 2

    if (endIndex - startIndex <= 0) {
      return undefined
    }

    let xMin = this.coordinates[startIndex]
    let yMin = this.coordinates[startIndex + 1]
    let xMax = xMin
    let yMax = yMin

    for (let i = startIndex + 2; i < endIndex; i += 2) {
      const x = this.coordinates[i]
      const y = this.coordinates[i + 1]
      xMin = Math.min(x, xMin)
      yMin = Math.min(y, yMin)
      xMax = Math.max(x, xMax)
      yMax = Math.max(y, yMax)
    }

    return { xMin, yMin, xMax, yMax }
  }

  // Utility methods

  private _normalizeContourIndex(index: number): number {
    if (index < 0) {
      index += this.contourInfo.length
    }
    if (index < 0 || index >= this.contourInfo.length) {
      throw new Error(`Contour index ${index} out of range`)
    }
    return index
  }

  private _getContourStartPoint(contourIndex: number): number {
    if (contourIndex === 0) {
      return 0
    }
    return this.contourInfo[contourIndex - 1].endPoint + 1
  }

  // Convert to SVG Path string
  toSVGPath(): string {
    let path = ''

    for (let i = 0; i < this.numContours; i++) {
      const segments = Array.from(this.iterContourSegments(i))

      for (let j = 0; j < segments.length; j++) {
        const segment = segments[j]
        const pts = segment.points

        if (j === 0) {
          path += `M ${pts[0].x} ${pts[0].y}`
        }

        if (segment.type === 'line' && pts.length === 2) {
          // Line
          path += ` L ${pts[1].x} ${pts[1].y}`
        } else if (segment.type === 'quad' && pts.length === 3) {
          // Quadratic curve
          path += ` Q ${pts[1].x} ${pts[1].y} ${pts[2].x} ${pts[2].y}`
        } else if (segment.type === 'cubic' && pts.length === 4) {
          // Cubic curve
          path += ` C ${pts[1].x} ${pts[1].y} ${pts[2].x} ${pts[2].y} ${pts[3].x} ${pts[3].y}`
        }
      }

      if (this.contourInfo[i].isClosed !== false) {
        path += ' Z'
      }
    }

    return path
  }

  // Create Path2D for Canvas rendering
  toPath2D(): Path2D {
    return new Path2D(this.toSVGPath())
  }

  private *_iterDecomposedSegments(
    startPoint: number,
    endPoint: number,
    isClosed: boolean
  ): Generator<{ type: 'line' | 'quad' | 'cubic'; coordinates: number[]; pointIndices: number[] }, void> {
    for (const segment of iterContourSegmentPointIndices(
      this.pointTypes,
      startPoint,
      endPoint,
      isClosed
    )) {
      const coordinates: number[] = []
      for (const pointIndex of segment.pointIndices) {
        const pointIndex2 = pointIndex * 2
        coordinates.push(this.coordinates[pointIndex2], this.coordinates[pointIndex2 + 1])
      }
      yield* decomposeSegment({
        type: segment.type,
        coordinates,
        pointIndices: segment.pointIndices,
      })
    }
  }
}

export interface Rect {
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

function* iterContourSegmentPointIndices(
  pointTypes: Uint8Array,
  startPoint: number,
  endPoint: number,
  isClosed: boolean
): Generator<{ type: 'line' | 'quad' | 'cubic' | 'quadBlob'; pointIndices: number[] }, void> {
  const numPoints = endPoint - startPoint + 1
  let firstOnCurve: number | null = null

  for (let i = 0; i < numPoints; i++) {
    if ((pointTypes[i + startPoint] & POINT_TYPE_MASK) === POINT_TYPE_ON_CURVE) {
      firstOnCurve = i
      break
    }
  }

  if (firstOnCurve === null) {
    yield {
      type: 'quadBlob',
      pointIndices: Array.from({ length: numPoints }, (_, index) => startPoint + index),
    }
    return
  }

  let currentSegment: number[] = []
  let segmentType: 'line' | 'quad' | 'cubic' = 'line'
  const lastIndex = isClosed ? numPoints : numPoints - 1 - firstOnCurve

  for (let i = 0; i <= lastIndex; i++) {
    const pointIndex = isClosed
      ? startPoint + ((firstOnCurve + i) % numPoints)
      : startPoint + firstOnCurve + i
    const pointType = pointTypes[pointIndex] & POINT_TYPE_MASK
    currentSegment.push(pointIndex)

    if (i === 0) {
      continue
    }

    switch (pointType) {
      case POINT_TYPE_ON_CURVE:
        yield { type: segmentType, pointIndices: currentSegment }
        currentSegment = [pointIndex]
        segmentType = 'line'
        break
      case POINT_TYPE_OFF_CURVE_QUAD:
        segmentType = 'quad'
        break
      case POINT_TYPE_OFF_CURVE_CUBIC:
        segmentType = 'cubic'
        break
      default:
        throw new Error('illegal point type')
    }
  }
}

function* decomposeSegment(segment: {
  type: 'line' | 'quad' | 'cubic' | 'quadBlob'
  coordinates: number[]
  pointIndices: number[]
}): Generator<{ type: 'line' | 'quad' | 'cubic'; coordinates: number[]; pointIndices: number[] }, void> {
  switch (segment.type) {
    case 'line':
      if (segment.coordinates.length === 4) {
        yield {
          type: 'line',
          coordinates: segment.coordinates,
          pointIndices: segment.pointIndices,
        }
      }
      break
    case 'cubic':
      if (segment.coordinates.length <= 6) {
        yield* decomposeQuad({
          type: 'quad',
          coordinates: segment.coordinates,
          pointIndices: segment.pointIndices,
        })
      } else if (segment.coordinates.length === 8) {
        yield {
          type: 'cubic',
          coordinates: segment.coordinates,
          pointIndices: segment.pointIndices,
        }
      } else if (segment.coordinates.length >= 8) {
        yield {
          type: 'cubic',
          coordinates: [
            ...segment.coordinates.slice(0, 4),
            ...segment.coordinates.slice(-4),
          ],
          pointIndices: [
            segment.pointIndices[0],
            segment.pointIndices[1],
            segment.pointIndices[segment.pointIndices.length - 2],
            segment.pointIndices[segment.pointIndices.length - 1],
          ],
        }
      }
      break
    case 'quad':
      yield* decomposeQuad({
        type: 'quad',
        coordinates: segment.coordinates,
        pointIndices: segment.pointIndices,
      })
      break
    case 'quadBlob': {
      const lastIndex = segment.coordinates.length - 2
      const mid = [
        (segment.coordinates[0] + segment.coordinates[lastIndex]) / 2,
        (segment.coordinates[1] + segment.coordinates[lastIndex + 1]) / 2,
      ]
      yield* decomposeQuad({
        type: 'quad',
        coordinates: [...mid, ...segment.coordinates, ...mid],
        pointIndices: [
          segment.pointIndices[segment.pointIndices.length - 1],
          ...segment.pointIndices,
          segment.pointIndices[0],
        ],
      })
      break
    }
  }
}

function* decomposeQuad(segment: {
  type: 'quad'
  coordinates: number[]
  pointIndices: number[]
}): Generator<{ type: 'quad'; coordinates: number[]; pointIndices: number[] }, void> {
  if (segment.coordinates.length < 6) {
    return
  }

  const coordinates = segment.coordinates
  const pointIndices = [...segment.pointIndices]
  let [x0, y0] = [coordinates[0], coordinates[1]]
  let [x1, y1] = [coordinates[2], coordinates[3]]
  const lastIndex = coordinates.length - 2

  for (let i = 4; i < lastIndex; i += 2) {
    const [x2, y2] = [coordinates[i], coordinates[i + 1]]
    const xMid = (x1 + x2) / 2
    const yMid = (y1 + y2) / 2
    yield {
      type: 'quad',
      coordinates: [x0, y0, x1, y1, xMid, yMid],
      pointIndices: pointIndices.slice(0, 3),
    }
    pointIndices.shift()
    ;[x0, y0] = [xMid, yMid]
    ;[x1, y1] = [x2, y2]
  }

  yield {
    type: 'quad',
    coordinates: [x0, y0, x1, y1, coordinates[lastIndex], coordinates[lastIndex + 1]],
    pointIndices: pointIndices.slice(0, 3),
  }
}

function coordinatesToPoints(coordinates: number[]): Point[] {
  const points: Point[] = []
  for (let i = 0; i < coordinates.length; i += 2) {
    points.push({ x: coordinates[i], y: coordinates[i + 1] })
  }
  return points
}
