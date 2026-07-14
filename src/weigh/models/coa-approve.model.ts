import { CoaApproveDto, CoaApproveRecord } from "../types/coa-approve.type";

export default class CoaApprove implements CoaApproveRecord {
  id: number;
  fName: string;
  fNameTh: string;

  constructor(data: Partial<CoaApproveRecord> = {}) {
    this.id = data.id ?? 0;
    this.fName = data.fName ?? "";
    this.fNameTh = data.fNameTh ?? "";
  }

  toListDto(): CoaApproveDto {
    return {
      id: this.id,
      fName: this.fName,
      fNameTh: this.fNameTh,
    };
  }
}
