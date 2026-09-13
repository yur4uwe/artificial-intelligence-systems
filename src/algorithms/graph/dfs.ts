import { BaseGraphSearch } from './base'

export class DFSAlgorithm extends BaseGraphSearch {
    protected readonly collectionName = 'стеку'
    protected readonly collectionExhaustedText = 'Стек вичерпано.'

    protected extractNext(collection: number[]): number {
        return collection.pop()!
    }

    protected orderNeighbors(neighbors: number[]): number[] {
        return neighbors.reverse()
    }
}

export default DFSAlgorithm
