import { BaseGraphSearch } from './base'

export class BFSAlgorithm extends BaseGraphSearch {
    protected readonly collectionName = 'черги'
    protected readonly collectionExhaustedText = 'Черга вичерпана.'

    protected extractNext(collection: number[]): number {
        return collection.shift()!
    }

    protected orderNeighbors(neighbors: number[]): number[] {
        return neighbors
    }
}

export default BFSAlgorithm
