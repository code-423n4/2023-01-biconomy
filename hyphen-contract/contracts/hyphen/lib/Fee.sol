// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

library Fee {
    uint256 private constant TOKEN_PRICE_BASE_DIVISOR = 10**28;
    uint256 private constant BASE_DIVISOR = 10000000000; // Basis Points * 100 for better accuracy

    function getTransferFee(
        uint256 _transferredAmount,
        uint256 _currentLiquidity,
        uint256 _suppliedLiquidity,
        uint256 _equilibriumFee,
        uint256 _maxFee,
        uint256 _excessStateTransferFee
    ) public pure returns (uint256) {
        uint256 resultingLiquidity = _currentLiquidity - _transferredAmount;

        // We return a constant value in excess state
        if (resultingLiquidity > _suppliedLiquidity) {
            return _excessStateTransferFee;
        }

        // Fee is represented in basis points * 10 for better accuracy
        uint256 numerator = _suppliedLiquidity * _suppliedLiquidity * _equilibriumFee * _maxFee; // F(max) * F(e) * L(e) ^ 2
        uint256 denominator = _equilibriumFee *
            _suppliedLiquidity *
            _suppliedLiquidity +
            (_maxFee - _equilibriumFee) *
            resultingLiquidity *
            resultingLiquidity; // F(e) * L(e) ^ 2 + (F(max) - F(e)) * L(r) ^ 2

        uint256 fee;
        if (denominator == 0) {
            fee = 0;
        } else {
            fee = numerator / denominator;
        }

        return fee;
    }

    function getFeeComponents(
        uint256 _transferredAmount,
        uint256 _currentLiquidity,
        uint256 _suppliedLiquidity,
        uint256 _equilibriumFee,
        uint256 _maxFee,
        uint256 _excessStateTransferFee
    )
        external
        pure
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 transferFeePerc = getTransferFee(
            _transferredAmount,
            _currentLiquidity,
            _suppliedLiquidity,
            _equilibriumFee,
            _maxFee,
            _excessStateTransferFee
        );

        uint256 lpFee;
        uint256 incentivePoolFee;
        if (transferFeePerc > _equilibriumFee) {
            lpFee = (_transferredAmount * _equilibriumFee) / BASE_DIVISOR;
            unchecked {
                incentivePoolFee = (_transferredAmount * (transferFeePerc - _equilibriumFee)) / BASE_DIVISOR;
            }
        } else {
            lpFee = (_transferredAmount * transferFeePerc) / BASE_DIVISOR;
        }
        uint256 transferFee = (_transferredAmount * transferFeePerc) / BASE_DIVISOR;
        return (lpFee, incentivePoolFee, transferFee);
    }

    function calculateGasFee(
        uint256 nativeTokenPriceInTransferredToken,
        uint256 gasUsed,
        uint256 tokenGasBaseFee
    ) external view returns (uint256) {
        uint256 gasFee = (gasUsed * nativeTokenPriceInTransferredToken * tx.gasprice) /
            TOKEN_PRICE_BASE_DIVISOR +
            tokenGasBaseFee;

        return gasFee;
    }
}
