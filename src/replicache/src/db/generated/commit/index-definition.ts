// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class IndexDefinition {
  bb: flatbuffers.ByteBuffer | null = null;
  bb_pos = 0;
  __init(i: number, bb: flatbuffers.ByteBuffer): IndexDefinition {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }

  static getRootAsIndexDefinition(
    bb: flatbuffers.ByteBuffer,
    obj?: IndexDefinition,
  ): IndexDefinition {
    return (obj || new IndexDefinition()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb,
    );
  }

  static getSizePrefixedRootAsIndexDefinition(
    bb: flatbuffers.ByteBuffer,
    obj?: IndexDefinition,
  ): IndexDefinition {
    bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
    return (obj || new IndexDefinition()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb,
    );
  }

  name(): string | null;
  name(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
  name(optionalEncoding?: any): string | Uint8Array | null {
    const offset = this.bb!.__offset(this.bb_pos, 4);
    return offset
      ? this.bb!.__string(this.bb_pos + offset, optionalEncoding)
      : null;
  }

  keyPrefix(index: number): number | null {
    const offset = this.bb!.__offset(this.bb_pos, 6);
    return offset
      ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index)
      : 0;
  }

  keyPrefixLength(): number {
    const offset = this.bb!.__offset(this.bb_pos, 6);
    return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
  }

  keyPrefixArray(): Uint8Array | null {
    const offset = this.bb!.__offset(this.bb_pos, 6);
    return offset
      ? new Uint8Array(
          this.bb!.bytes().buffer,
          this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset),
          this.bb!.__vector_len(this.bb_pos + offset),
        )
      : null;
  }

  jsonPointer(): string | null;
  jsonPointer(
    optionalEncoding: flatbuffers.Encoding,
  ): string | Uint8Array | null;
  jsonPointer(optionalEncoding?: any): string | Uint8Array | null {
    const offset = this.bb!.__offset(this.bb_pos, 8);
    return offset
      ? this.bb!.__string(this.bb_pos + offset, optionalEncoding)
      : null;
  }

  static startIndexDefinition(builder: flatbuffers.Builder) {
    builder.startObject(3);
  }

  static addName(builder: flatbuffers.Builder, nameOffset: flatbuffers.Offset) {
    builder.addFieldOffset(0, nameOffset, 0);
  }

  static addKeyPrefix(
    builder: flatbuffers.Builder,
    keyPrefixOffset: flatbuffers.Offset,
  ) {
    builder.addFieldOffset(1, keyPrefixOffset, 0);
  }

  static createKeyPrefixVector(
    builder: flatbuffers.Builder,
    data: number[] | Uint8Array,
  ): flatbuffers.Offset {
    builder.startVector(1, data.length, 1);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addInt8(data[i]!);
    }
    return builder.endVector();
  }

  static startKeyPrefixVector(builder: flatbuffers.Builder, numElems: number) {
    builder.startVector(1, numElems, 1);
  }

  static addJsonPointer(
    builder: flatbuffers.Builder,
    jsonPointerOffset: flatbuffers.Offset,
  ) {
    builder.addFieldOffset(2, jsonPointerOffset, 0);
  }

  static endIndexDefinition(builder: flatbuffers.Builder): flatbuffers.Offset {
    const offset = builder.endObject();
    return offset;
  }

  static createIndexDefinition(
    builder: flatbuffers.Builder,
    nameOffset: flatbuffers.Offset,
    keyPrefixOffset: flatbuffers.Offset,
    jsonPointerOffset: flatbuffers.Offset,
  ): flatbuffers.Offset {
    IndexDefinition.startIndexDefinition(builder);
    IndexDefinition.addName(builder, nameOffset);
    IndexDefinition.addKeyPrefix(builder, keyPrefixOffset);
    IndexDefinition.addJsonPointer(builder, jsonPointerOffset);
    return IndexDefinition.endIndexDefinition(builder);
  }
}
